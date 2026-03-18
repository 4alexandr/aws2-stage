// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * This service is create viewer context data
 *
 * @module js/structureViewerSelectionHandlerProvider
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import csidsToObjSvc from 'js/csidsToObjectsConverterService';
import objectToCSIDGeneratorService from 'js/objectToCSIDGeneratorService';
import appCtxService from 'js/appCtxService';
import StructureViewerService from 'js/structureViewerService';
import objectsToPackedOccurrenceCSIDsService from 'js/objectsToPackedOccurrenceCSIDsService';
import TracelinkSelectionHandler from 'js/tracelinkSelectionHandler';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import assert from 'assert';
import logger from 'js/logger';
import 'js/logger';

var exports = {};

/**
 * Provides an instance of structure viewer selection handler
 *
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {StructureViewerSelectionHandler} Returns viewer selection manager
 */
export let getStructureViewerSelectionHandler = function( viewerContextData ) {
    var selectionHandler = null;

    if( TracelinkSelectionHandler.instance.isRootSelectionTracelinkType() ) {
        selectionHandler = TracelinkSelectionHandler.instance.createSelectionHandler( StructureViewerSelectionHandler, viewerContextData );
    } else {
        selectionHandler = new StructureViewerSelectionHandler( viewerContextData );
    }

    return selectionHandler;
};

/**
 * Class to hold the structure viewer selection data
 *
 * @constructor StructureViewerSelectionHandler
 * @param {Object} viewerContextData Viewer Context data
 */
var StructureViewerSelectionHandler = function( viewerContextData ) {
    assert( viewerContextData, 'Viewer context data can not be null' );
    var self = this;
    var m_isSelectionInProgress = false;
    var m_selectionRequestToBeProcessed = null;
    /**
     * Viewer selection types
     */
    self.SelectionTypes = {
        ROOT_PRODUCT_SELECTED: 'ROOT_PRODUCT_SELECTED',
        OCC_PARENT_SELECTED: 'OCC_PARENT_SELECTED',
        SAVED_BOOKMARK_SELECTED: 'SAVED_BOOKMARK_SELECTED',
        OCC_SELECTED: 'OCC_SELECTED'
    };

    self.viewerCtxData = viewerContextData;
    self.pwaSelectionChangeEventSub = null;
    self.isViewerSelectionListenerAttached = false;
    self.packUnpackSuccessEventSub = null;

    /**
     * Handle selection changes in ACE
     *
     * @param  {Object} eventData event data
     */
    StructureViewerSelectionHandler.prototype.selectionChangeEventHandler = function( eventData ) {
        if( !( eventData &&
                eventData.dataCtxNode &&
                eventData.dataCtxNode.context &&
                eventData.dataCtxNode.context.viewKey ===
                StructureViewerService.instance.getOccmgmtContextNameKeyFromViewerContext( self.viewerCtxData.getViewerCtxNamespace() ) ) ) {
            return;
        }
        if( !m_isSelectionInProgress ) {
            _processSelectionEvent( eventData.selectionModel );
        } else {
            m_selectionRequestToBeProcessed = eventData.selectionModel;
        }
    };

    /**
     * Handle selection changes due to scroll in ACE
     *
     * @param  {Object} eventData event data
     */
    StructureViewerSelectionHandler.prototype.onPackUnpackOperation = function( eventData ) {
        if( !( eventData &&
                eventData.dataCtxNode &&
                eventData.dataCtxNode.context &&
                eventData.dataCtxNode.context.viewKey ===
                StructureViewerService.instance.getOccmgmtContextNameKeyFromViewerContext( self.viewerCtxData.getViewerCtxNamespace() ) ) ) {
            return;
        }
        let occmgmtContext = StructureViewerService.instance.getOccmgmtContextFromViewerContext( self.viewerCtxData.getViewerCtxNamespace() );
        let aceSelectionModel = occmgmtContext.pwaSelectionModel;
        if( aceSelectionModel ) {
            if( !m_isSelectionInProgress ) {
                _processSelectionEvent( aceSelectionModel, true );
            } else {
                m_selectionRequestToBeProcessed = aceSelectionModel;
            }
        }
    };

    var _processSelectionEvent = function( aceSelectionModel, isPackedUnpackedActionPerformed ) {
        m_isSelectionInProgress = true;
        _processSelectionEventInternal( aceSelectionModel, isPackedUnpackedActionPerformed ).then( function() {
            if( !_.isNull( m_selectionRequestToBeProcessed ) ) {
                _processSelectionEvent( m_selectionRequestToBeProcessed );
                m_selectionRequestToBeProcessed = null;
            } else {
                m_isSelectionInProgress = false;
            }
        }, function( errorMsg ) {
            m_isSelectionInProgress = false;
        } );
    };

    var _processSelectionEventInternal = function( aceSelectionModel, isPackedUnpackedActionPerformed ) {
        var returnPromise = AwPromiseService.instance.defer();
        self.viewerCtxData.getSelectionManager().setMultiSelectModeInViewer( aceSelectionModel.isMultiSelectionEnabled() );
        var currentlySelectedModelObjs = self.viewerCtxData.getSelectionManager()
            .getSelectedModelObjects();
        var currentlySelectedCsids = self.viewerCtxData.getSelectionManager().getSelectedCsids();
        var selectionUids = aceSelectionModel.getSelection();
        var selections = _.compact( cdm.getObjects( selectionUids ) );
        var selectionType = self.getSelectionType( selections );

        if( selectionType === self.SelectionTypes.OCC_SELECTED ) {
            if( !_.isNull( currentlySelectedModelObjs ) &&
                !_.isUndefined( currentlySelectedModelObjs ) &&
                !_.isEmpty( currentlySelectedModelObjs ) ) {
                var newSelectionLength = 0;
                if( selections ) {
                    newSelectionLength = selections.length;
                }
                var currentSelectionLength = currentlySelectedModelObjs.length;
                if( newSelectionLength === 0 ) {
                    self.viewerCtxData.getSelectionManager().selectPartsInViewerUsingModelObject(
                        selections );
                    self.viewerCtxData.getSelectionManager().selectPartsInViewerUsingCsid( [] );
                    returnPromise.resolve();
                } else if( newSelectionLength > currentSelectionLength ) { //Something got selected
                    var modelObjListToBeSelected = _.xor( currentlySelectedModelObjs, selections );
                    var newlySelectedCsids = _.cloneDeep( currentlySelectedCsids );
                    for( var i = 0; i < modelObjListToBeSelected.length; i++ ) {
                        newlySelectedCsids.push( objectToCSIDGeneratorService.getCloneStableIdChain( modelObjListToBeSelected[ i ] ) );
                    }
                    self.determineAndSelectPackedOccs( selections, newlySelectedCsids ).then( function() {
                        returnPromise.resolve();
                    }, function( errorMsg ) {
                        returnPromise.reject( errorMsg );
                    } );
                } else if( currentSelectionLength > newSelectionLength ) {
                    var commonModelObjects = _.intersection( currentlySelectedModelObjs, selections );
                    var newlySelectedCsids = null;
                    if( commonModelObjects.length > 0 ) {
                        //Something got deselected
                        var modelObjListToBeDeSelected = _.xor( currentlySelectedModelObjs, selections );
                        newlySelectedCsids = _.cloneDeep( currentlySelectedCsids );
                        for( var i = 0; i < modelObjListToBeDeSelected.length; i++ ) {
                            var csid = objectToCSIDGeneratorService
                                .getCloneStableIdChain( modelObjListToBeDeSelected[ i ] );
                            var index = newlySelectedCsids.indexOf( csid );
                            if( index > -1 ) {
                                newlySelectedCsids.splice( index, 1 );
                            }
                        }
                    } else {
                        //We got entirely new set of selection from ACE tree. This scenarion occurs when we multiselect parts in ACE tree
                        //using control key and ACE does not enter multiselect mode. So, now if user clicks any other part,
                        //ACE tree will deselect all previously selected parts and only select new part. So, in viewer also
                        //we have update the selection entirely.
                        newlySelectedCsids = [];
                        for( var i = 0; i < selections.length; i++ ) {
                            newlySelectedCsids.push( objectToCSIDGeneratorService.getCloneStableIdChain( selections[ i ] ) );
                        }
                    }
                    self.selectInViewer( selections, newlySelectedCsids );
                    returnPromise.resolve();
                } else { // When new and current selection length is same
                    if( newSelectionLength === 1 && currentSelectionLength - newSelectionLength === 0 ) {
                        //In case of current and new selection length is same and equals to 1, then determine and select packed occs only if
                        // 1) Packed operation is performed, hence perform packed occus selection in viewer.
                        //    OR
                        // 2) Current and new selections are not equal. This means there is some change in new selection and hence we need to determine packed ocuurences.

                        var newlySelectedModelObj = selections[ 0 ];
                        var newlySelectedCsids = [ objectToCSIDGeneratorService.getCloneStableIdChain( newlySelectedModelObj ) ];
                        if( isPackedUnpackedActionPerformed || !_.isEqual( newlySelectedCsids, currentlySelectedCsids ) ) {
                            self.determineAndSelectPackedOccs( selections, newlySelectedCsids ).then( function() {
                                returnPromise.resolve();
                            }, function( errorMsg ) {
                                returnPromise.reject( errorMsg );
                            } );
                        } else {
                            returnPromise.resolve();
                        }
                    } else if( isPackedUnpackedActionPerformed ) {
                        // if current and new selections are same and if their length is grater than 1, determine packed occus if packed operation is performed.
                        var newlySelectedCsids = [];
                        for( var i = 0; i < selections.length; i++ ) {
                            newlySelectedCsids.push( objectToCSIDGeneratorService.getCloneStableIdChain( selections[ i ] ) );
                        }
                        self.determineAndSelectPackedOccs( selections, newlySelectedCsids ).then( function() {
                            returnPromise.resolve();
                        }, function( errorMsg ) {
                            returnPromise.reject( errorMsg );
                        } );
                    } else {
                        returnPromise.resolve();
                    }
                }
            } else {
                // Add code to handle first time selections via ACE tree
                var newlySelectedCsids = [];
                for( var i = 0; i < selections.length; i++ ) {
                    newlySelectedCsids.push( objectToCSIDGeneratorService
                        .getCloneStableIdChain( selections[ i ] ) );
                }
                self.determineAndSelectPackedOccs( selections, newlySelectedCsids ).then( function() {
                    returnPromise.resolve();
                }, function( errorMsg ) {
                    returnPromise.reject( errorMsg );
                } );
            }
        } else if( selectionType === self.SelectionTypes.OCC_PARENT_SELECTED ) {
            let occmgmtContext = StructureViewerService.instance.getOccmgmtContextFromViewerContext( self.viewerCtxData.getViewerCtxNamespace() );
            let openedElement = occmgmtContext.openedElement;
            self.viewerCtxData.updateCurrentViewerProductContext( openedElement );
            let openedElementCsid = objectToCSIDGeneratorService.getCloneStableIdChain( openedElement );
            //Note: We are making opened element selected.
            //Selecting in Viewer is not needed as it will show all children also selected.
            self.viewerCtxData.getSelectionManager().selectPartsInViewerUsingModelObject( [ openedElement ] );
            self.viewerCtxData.getSelectionManager().setContext( [ openedElementCsid ] );
            returnPromise.resolve();
        } else if( selectionType === self.SelectionTypes.ROOT_PRODUCT_SELECTED ||
            selectionType === self.SelectionTypes.SAVED_BOOKMARK_SELECTED ) {
            let occmgmtContext = StructureViewerService.instance.getOccmgmtContextFromViewerContext( self.viewerCtxData.getViewerCtxNamespace() );
            let openedElement = occmgmtContext.openedElement;
            self.viewerCtxData.updateCurrentViewerProductContext( openedElement );
            self.viewerCtxData.getSelectionManager().setContext( [ '' ] );
            self.selectInViewer( [], [] );
            returnPromise.resolve();
        }
        StructureViewerService.instance.updateViewerSelectionCommandsVisibility( self.viewerCtxData );
        return returnPromise.promise;
    };

    /**
     * Viewer selection changed handler
     *
     * @param  {String[]} occCSIDChains occurrence  chains
     */
    StructureViewerSelectionHandler.prototype.viewerSelectionChangedHandler = function( occCSIDChains ) {
        if( occCSIDChains && occCSIDChains.length !== 0 ) {
            var promise = csidsToObjSvc.doPerformSearchForProvidedCSIDChains( occCSIDChains, 'true' );
            promise.then( function( csidModelData ) {
                var aceSelectionUpdateEventData = {};
                aceSelectionUpdateEventData.objectsToSelect = csidModelData.searchResults;
                //Visualization selection manager returns blank string ('') for root selection
                //ACE does not understand this and does nothing in tree
                //We need to add opened element model object to list
                if( _.includes( occCSIDChains, '' ) ) {
                    if( !aceSelectionUpdateEventData.objectsToSelect ) {
                        let occmgmtContext = StructureViewerService.instance.getOccmgmtContextFromViewerContext( self.viewerCtxData.getViewerCtxNamespace() );
                        aceSelectionUpdateEventData.objectsToSelect = [ occmgmtContext.topElement ];
                    }
                }
                self.viewerCtxData.getSelectionManager().selectPartsInViewerUsingModelObject(
                    aceSelectionUpdateEventData.objectsToSelect );
                self.viewerCtxData.getSelectionManager().selectPartsInViewerUsingCsid( occCSIDChains );
                aceSelectionUpdateEventData.viewToReact = StructureViewerService.instance.getOccmgmtContextNameKeyFromViewerContext( self.viewerCtxData.getViewerCtxNamespace() );
                eventBus.publish( 'aceElementsSelectionUpdatedEvent', aceSelectionUpdateEventData );
            }, function( errorMsg ) {
                logger.error( 'Failed to get model object data using csid : ' + errorMsg );
            } );
        } else {
            var aceSelectionUpdateEventData = {};
            aceSelectionUpdateEventData.objectsToSelect = [];
            self.viewerCtxData.getSelectionManager().selectPartsInViewerUsingModelObject( [] );
            self.viewerCtxData.getSelectionManager().selectPartsInViewerUsingCsid( [] );
            aceSelectionUpdateEventData.viewToReact = StructureViewerService.instance.getOccmgmtContextNameKeyFromViewerContext( self.viewerCtxData.getViewerCtxNamespace() );
            eventBus.publish( 'aceElementsSelectionUpdatedEvent', aceSelectionUpdateEventData );
        }

        StructureViewerService.instance.updateViewerSelectionCommandsVisibility( self.viewerCtxData );
    };
};

/**
 * Register the viewer listener
 */
StructureViewerSelectionHandler.prototype.registerForSelectionEvents = function() {
    var self = this;
    if( self.pwaSelectionChangeEventSub === null ) {
        self.pwaSelectionChangeEventSub = eventBus
            .subscribe( 'primaryWorkArea.selectionChangeEvent', self.getSelectionChangeEventHandler(), 'structureViewerSelectionHandler' );
    }

    if( self.packUnpackSuccessEventSub === null ) {
        self.packUnpackSuccessEventSub = eventBus
            .subscribe( 'tree.packUnpackSuccessful', self.getPackUnpackSuccessEventHandler(), 'structureViewerSelectionHandler' );
    }

    if( !self.isViewerSelectionListenerAttached ) {
        self.isViewerSelectionListenerAttached = true;
        self.viewerCtxData.getSelectionManager().addViewerSelectionChangedListener(
            self.viewerSelectionChangedHandler );
    }
};

/**
 * Get the selection change handler
 *
 * @returns {Object} the handler
 */
StructureViewerSelectionHandler.prototype.getSelectionChangeEventHandler = function() {
    var self = this;
    return self.selectionChangeEventHandler;
};

/**
 * Get the selection change handler for newly loaded models in ACE
 *
 * @returns {Object} the handler
 */
StructureViewerSelectionHandler.prototype.getPackUnpackSuccessEventHandler = function() {
    var self = this;
    return self.onPackUnpackOperation;
};

/*
 * selects in viewer
 *
 * @param  {Object[]} modelObjects for which packed occs are to be determined
 * @param  {String[]} determinedCSIds already selected CSIds
 */
StructureViewerSelectionHandler.prototype.selectInViewer = function( modelObjects, cSIds ) {
    var self = this;
    self.viewerCtxData.getSelectionManager().selectPartsInViewerUsingModelObject(
        modelObjects );
    self.viewerCtxData.getSelectionManager().selectPartsInViewerUsingCsid( cSIds );
};

/**
 * Determine packed occs and updates Viewer selections
 *
 * @param  {Object[]} modelObjects for which packed occs are to be determined
 * @param  {String[]} determinedCSIds already selected CSIds
 *
 * @returns {Promise} When packed occurrences are determined
 */
StructureViewerSelectionHandler.prototype.determineAndSelectPackedOccs = function( modelObjects, determinedCSIds ) {
    var self = this;
    var returnPromise = AwPromiseService.instance.defer();
    let occmgmtContext = StructureViewerService.instance.getOccmgmtContextFromViewerContext( self.viewerCtxData.getViewerCtxNamespace() );
    var productCtx = occmgmtContext.productContextInfo;
    var packedOccPromise = objectsToPackedOccurrenceCSIDsService.getCloneStableIDsWithPackedOccurrences(
        productCtx, modelObjects );

    if( !_.isUndefined( packedOccPromise ) ) {
        packedOccPromise.then( function( response ) {
            if( response.csids ) {
                csidsToObjSvc.doPerformSearchForProvidedCSIDChains( response.csids ).then( function() {
                    var actualSelectedCsids = _.concat( determinedCSIds, response.csids );
                    self.selectInViewer( modelObjects, actualSelectedCsids );
                    StructureViewerService.instance.updateViewerSelectionCommandsVisibility( self.viewerCtxData );
                } );
            } else {
                self.selectInViewer( modelObjects, determinedCSIds );
            }
            StructureViewerService.instance.updateViewerSelectionCommandsVisibility( self.viewerCtxData );
            returnPromise.resolve();
        }, function( errorMsg ) {
            returnPromise.reject( errorMsg );
        } );

        return returnPromise.promise;
    }

    self.selectInViewer( modelObjects, determinedCSIds );
    returnPromise.resolve();
    return returnPromise.promise;
};

/**
 * Get the selection type.
 *
 * @param  {Object[]} selected selected model objects
 * @returns {String} selection type string
 */
StructureViewerSelectionHandler.prototype.getSelectionType = function( selected ) {
    var self = this;
    let occmgmtContext = StructureViewerService.instance.getOccmgmtContextFromViewerContext( self.viewerCtxData.getViewerCtxNamespace() );
    var currentRoot = occmgmtContext.openedElement;
    var actualRoot = occmgmtContext.topElement;
    if( _.isUndefined( selected ) || _.isNull( selected ) || _.isEmpty( selected ) ) {
        return currentRoot === actualRoot ? self.SelectionTypes.ROOT_PRODUCT_SELECTED :
            self.SelectionTypes.OCC_PARENT_SELECTED;
    }

    if( selected.length === 1 && currentRoot && selected[ 0 ].uid === actualRoot.uid ) {
        return self.SelectionTypes.ROOT_PRODUCT_SELECTED;
    }

    var viewModeCtx = appCtxService.getCtx( 'ViewModeContext.ViewModeContext' );
    //Parent selection if it is the parent object and the only object selected
    var isParentSelection = selected.length === 1 && currentRoot && selected[ 0 ].uid === currentRoot.uid && viewModeCtx === 'SummaryView';

    //If not parent selection must be PWA selection
    if( !isParentSelection ) {
        if( currentRoot && actualRoot && self.isSavedWorkingContext( currentRoot ) && currentRoot.uid === actualRoot.uid ) {
            if( selected.length === 1 ) {
                var parentUidOfSelected = getParentUid( selected[ 0 ] );
                if( parentUidOfSelected && parentUidOfSelected === currentRoot.uid ) {
                    return self.SelectionTypes.ROOT_PRODUCT_SELECTED;
                }
            }
            return self.SelectionTypes.OCC_SELECTED;
        }
        //If parent is SWC selection is root, otherwise simple occ
        return self.isSavedWorkingContext( currentRoot ) ? self.SelectionTypes.ROOT_PRODUCT_SELECTED :
            self.SelectionTypes.OCC_SELECTED;
    }

    //otherwise return selection type for parent
    return self.isSavedWorkingContext( currentRoot ) ? self.SelectionTypes.SAVED_BOOKMARK_SELECTED :
        self.SelectionTypes.OCC_PARENT_SELECTED;
};

/**
 * Find parent model object uid
 *
 * @param {Object} modelObject Model object whoes parent is to be found
 * @returns {String} Uid of parent model object
 */
function getParentUid( modelObject ) {
    if( modelObject && modelObject.props ) {
        var props = modelObject.props;
        var uid;
        if( props.awb0BreadcrumbAncestor && !_.isEmpty( props.awb0BreadcrumbAncestor.dbValues ) ) {
            uid = props.awb0BreadcrumbAncestor.dbValues[ 0 ];
        } else if( props.awb0Parent && !_.isEmpty( props.awb0Parent.dbValues ) ) {
            uid = props.awb0Parent.dbValues[ 0 ];
        }
        if( cdm.isValidObjectUid( uid ) ) {
            return uid;
        }
    }
    return null;
}

/**
 * Utility to check if a model object is a saved working context.
 *
 * @param {Object} modelObject model object to be tested
 * @returns {Boolean} true if it is saved working context
 */
StructureViewerSelectionHandler.prototype.isSavedWorkingContext = function( modelObject ) {
    //If "Awb0SavedBookmark" is in the  types of the model object, it is a SWC
    if( modelObject && modelObject.modelType.typeHierarchyArray.indexOf( 'Awb0SavedBookmark' ) !== -1 ) {
        return true;
    }
    return false;
};

/**
 * Clean viewer selection listeners
 */
StructureViewerSelectionHandler.prototype.cleanUp = function() {
    var self = this;
    if( self.pwaSelectionChangeEventSub ) {
        eventBus.unsubscribe( self.pwaSelectionChangeEventSub );
        self.pwaSelectionChangeEventSub = null;
    }

    if( self.packUnpackSuccessEventSub ) {
        eventBus.unsubscribe( self.packUnpackSuccessEventSub );
        self.packUnpackSuccessEventSub = null;
    }

    if( self.isViewerSelectionListenerAttached ) {
        self.isViewerSelectionListenerAttached = false;
        self.viewerCtxData.getSelectionManager().removeViewerSelectionChangedListener(
            self.viewerSelectionChangedHandler );
    }
};

export default exports = {
    getStructureViewerSelectionHandler
};
/**
 * This service is used to get StructureViewerSelectionHandler
 *
 * @memberof NgServices
 */
app.factory( 'structureViewerSelectionHandlerProvider', () => exports );
