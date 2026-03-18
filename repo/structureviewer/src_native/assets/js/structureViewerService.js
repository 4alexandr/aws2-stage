//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/* eslint-disable no-invalid-this */
/* eslint-disable class-methods-use-this */

/*global
 define
 */
/**
 * @module js/structureViewerService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import viewerRenderService from 'js/viewerRender.service';
import viewerContextService from 'js/viewerContext.service';
import objectToCSIDGeneratorService from 'js/objectToCSIDGeneratorService';
import dataManagementService from 'soa/dataManagementService';
import cdm from 'soa/kernel/clientDataModel';
import viewerPreferenceService from 'js/viewerPreference.service';
import tcServerVersion from 'js/TcServerVersion';
import messagingService from 'js/messagingService';
import localeService from 'js/localeService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import logger from 'js/logger';
import AwBaseService from 'js/awBaseService';
import soaSvc from 'soa/kernel/soaService';
import commandPanelService from 'js/commandPanel.service';
import disclosureService from 'js/disclosureService';
import viewerSecondaryModelSvc from 'js/viewerSecondaryModel.service';
import dmSvc from 'soa/dataManagementService';
import createLaunchInfoRequest from 'js/createLaunchInfoRequest';

//var exports = {};

export default class StructureViewerService extends AwBaseService {
    constructor() {
        super();
        /**
         * Viewer div element
         */
        this._lastViewerDivElement = null;

        /**
         * Viewer view object
         */
        this._lastViewerCtxObj = null;

        /**
         * Viewer last product context info
         */
        this._lastProductContextInfoObj = null;

        /**
         * Viewer 2 div element
         */
        this._lastViewerDivElement2 = null;

        /**
         * Viewer 2 view object
         */
        this._lastViewerCtxObj2 = null;

        /**
         * Viewer 2 last product context info
         */
        this._lastProductContextInfoObj2 = null;

        /**
         * App Session creation started listener
         */
        this._appSessionCreateStaredListener = null;

        /**
         * App Session creation stopped listener
         */
        this._appSessionCreateStoppedListener = null;

        /**
         * App Session created listener
         */
        this._appSessionCreatedListener = null;

        /**
         * Retain 3D for App Session creation
         */
        this._retain3DforAppSessionCreation = false;

        /**
         * PCI changed listener
         */
        this._productContextInfoChangedEvent = null;

        /**
         * Procuct launch listner
         */
        this._productLaunchEvent = null;

        /**
         * Filter state
         */
        this._isFilterApplied = true;

        /**
         * Reset state
         */
        this._aceResetState = [];

        /**
         * Listen to filter event to reload viewer
         */
        this._primaryWorkAreaContentReloadEvent = null;

        /**
         * Listen to save session event
         */
        this._aceSaveSessionSuccessEvent = null;

        /**
         * Event to reset filter
         */
        this._resetFilterEvent = null;

        /**
         * Event to reset filter
         */
        this._structureCompareSecondViewerNamespace = 'awStructureCompareViewer';

        /**
         * Session save as panel open subscription
         */
        this._appSessionSaveAsStaredListener = null;

        /**
         * Session save as subscription
         */
        this._appSessionSaveAsListener = null;

        /**
         * Session save as panel close subscription
         */
        this._appSessionSaveAsStoppedListener = null;

        /**
         * Ace reset structure started subscription
         */
        this._aceResetStructureStartedListener = null;

        if( tcServerVersion.majorVersion >= 13 ) {
            this._registerAppSessionCreationListener();
            this._registerAppSessionSaveAsListener();
            this.registerAceSaveSessionSuccessEvent();
            this.registerAceResetStructureEvent();
            this._registerProductLaunchEventListener();
        }
        if( tcServerVersion.majorVersion === 12 && tcServerVersion.minorVersion >= 4 ) {
            this._registerAppSessionCreationListener124();
            this._registerAppSessionSaveAsListener124();
        }
        this.registerAceResetStructureEvent();
    }

    /**
     * Set OccmgmtContext key name on viewer context
     *
     * @param {String} viewerContextNamespace Viewer context namespace
     * @param {String} occmgmtContextNameKey OccmgmtContext key name
     */
    setOccmgmtContextNameKeyOnViewerContext( viewerContextNamespace, occmgmtContextNameKey ) {
        viewerContextService.updateViewerApplicationContext( viewerContextNamespace,
            viewerContextService.VIEWER_OCCMGMTCONTEXT_NAMESPACE_TOKEN, occmgmtContextNameKey );
    }

    /**
     * Get OccmgmtContext key name from viewer context
     *
     * @param {String} viewerContextNamespace Viewer context namespace
     * @return {String} OccmgmtContext key name
     */
    getOccmgmtContextNameKeyFromViewerContext( viewerContextNamespace ) {
        return viewerContextService.getViewerApplicationContext( viewerContextNamespace,
            viewerContextService.VIEWER_OCCMGMTCONTEXT_NAMESPACE_TOKEN );
    }

    /**
     * Get OccmgmtContext key name from viewer context
     *
     * @param {String} viewerContextNamespace Viewer context namespace
     * @return {Object} OccmgmtContext object
     */
    getOccmgmtContextFromViewerContext( viewerContextNamespace ) {
        let occmgmtContextKey = viewerContextService.getViewerApplicationContext( viewerContextNamespace,
            viewerContextService.VIEWER_OCCMGMTCONTEXT_NAMESPACE_TOKEN );
        return appCtxService.getCtx( occmgmtContextKey );
    }

    /**
     * Check if same product being opened as previous
     *
     * @param {Object} productCtxInfo product context info object
     * @param {Object} contextNameKey Occmgmt context name key
     *
     * @return {Boolean} True is same product is being opened
     */
    isSameProductOpenedAsPrevious( productCtxInfo, contextNameKey ) {
        let checkIfResetPerformed = this.checkIfResetWasPerformedOnPci( contextNameKey );
        if( appCtxService.getCtx( 'splitView.viewKeys' ) ) {
            let sourceContextKey = appCtxService.getCtx( 'splitView.viewKeys' )[ 0 ];
            let targetContextKey = appCtxService.getCtx( 'splitView.viewKeys' )[ 1 ];
            if( contextNameKey === sourceContextKey ) {
                // eslint-disable-next-line max-len
                return this._lastProductContextInfoObj && this._lastProductContextInfoObj.uid === productCtxInfo.uid && this._lastViewerCtxObj && !this._lastViewerCtxObj.isConnectionClosed() && this
                    ._isFilterApplied && !checkIfResetPerformed;
            } else if( contextNameKey === targetContextKey ) {
                // eslint-disable-next-line max-len
                return this._lastProductContextInfoObj2 && this._lastProductContextInfoObj2.uid === productCtxInfo.uid && this._lastViewerCtxObj2 && !this._lastViewerCtxObj2.isConnectionClosed() && this
                    ._isFilterApplied && !checkIfResetPerformed;
            }
        } else if( contextNameKey === 'occmgmtContext' ) {
            // eslint-disable-next-line max-len
            return this._lastProductContextInfoObj && this._lastProductContextInfoObj.uid === productCtxInfo.uid && this._lastViewerCtxObj && !this._lastViewerCtxObj.isConnectionClosed() && this
                ._isFilterApplied && !checkIfResetPerformed;
        }
        return false;
    }

    /**
     * Update vis session
     *
     * @param {String} occmgmtCtxKey occmgmtcontext key
     */
    updateVisSession( occmgmtCtxKey ) {
        if( _.isUndefined( occmgmtCtxKey ) || _.isNull( occmgmtCtxKey ) ) {
            return;
        }
        //The indexed PCI doesn't contain the Awb0StructureRecepie property and hence causes issues while session creation
        //Always pass the non-indexed PCI
        let productCtxInfo = appCtxService.getCtx( occmgmtCtxKey ).productContextInfo;
        let self = this;
        if( self._lastViewerCtxObj && !self._lastViewerCtxObj.isConnectionClosed() && productCtxInfo.props.awb0ContextObject ) {
            if( Array.isArray( productCtxInfo.props.awb0ContextObject.dbValues ) &&
                !_.isUndefined( productCtxInfo.props.awb0ContextObject.dbValues[ 0 ] ) &&
                !_.isNull( productCtxInfo.props.awb0ContextObject.dbValues[ 0 ] ) ) {
                viewerContextService.updateViewerApplicationContext( self._lastViewerCtxObj.getViewerCtxNamespace(), 'saveSessionButtonDisabled',
                    true );
                self._getLastModDate( occmgmtCtxKey ).then( ( LMD ) => {
                    self._lastViewerCtxObj.getSessionMgr().updateAppSession(
                        productCtxInfo.props.awb0ContextObject.dbValues[ 0 ], productCtxInfo.uid, LMD ).then( () => {
                            setTimeout( () => {
                                viewerContextService.updateViewerApplicationContext( self._lastViewerCtxObj.getViewerCtxNamespace(), 'saveSessionButtonDisabled',
                                    false );
                            }, 5000 );
                            self._syncAppSessionLSDWithAutobookmark();
                        },
                        errorMsg => {
                            if( errorMsg.name === 'TcVisSessionUpdateError' ) {
                                if( errorMsg.message === 'Checkout' ) {
                                    self._popupSaveAsDialog();
                                } else {
                                    messagingService.showWarning( localeService.getLoadedText( 'StructureViewerMessages' ).InternalError );
                                }
                            }
                        } );
                } );
            }
        }
    }

    /**
     * Check if App Session is being opened
     *
     * @param {Object} productCtxInfo product context info object
     * @return {Boolean} True is same product is being opened
     */
    createVisSessionifAppSessionBeingOpened( productCtxInfo, last_mod_date ) {
        if( this._retain3DforAppSessionCreation ) {
            this._retain3DforAppSessionCreation = false;
            let self = this;
            if( this._lastViewerCtxObj && !this._lastViewerCtxObj.isConnectionClosed() &&
                productCtxInfo.props.awb0ContextObject ) {
                if( Array.isArray( productCtxInfo.props.awb0ContextObject.dbValues ) &&
                    !_.isUndefined( productCtxInfo.props.awb0ContextObject.dbValues[ 0 ] ) &&
                    !_.isNull( productCtxInfo.props.awb0ContextObject.dbValues[ 0 ] ) ) {
                    this._lastViewerCtxObj.getSessionMgr().updateAppSession(
                        productCtxInfo.props.awb0ContextObject.dbValues[ 0 ], productCtxInfo.uid, last_mod_date ).then( () => {
                            self._syncAppSessionLSDWithAutobookmark();
                            eventBus.publish( 'sv.reload3DViewer', { viewerContext: self._lastViewerCtxObj.getViewerCtxNamespace() } );
                        },
                        errorMsg => {
                            if( errorMsg.name === 'TcVisSessionUpdateError' ) {
                                if( errorMsg.message === 'Checkout' ) {
                                    this._popupSaveAsDialog();
                                } else {
                                    messagingService.showWarning( localeService.getLoadedText( 'StructureViewerMessages' ).InternalError );
                                }
                            }
                        } );
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Check if App Session is being opened
     *
     * @param {Object} productCtxInfo product context info object
     * @return {Boolean} True is same product is being opened
     */
    isAppSessionBeingOpened( productCtxInfo ) {
        if( this._retain3DforAppSessionCreation ) {
            if( this._lastViewerCtxObj && !this._lastViewerCtxObj.isConnectionClosed() &&
                productCtxInfo.props.awb0ContextObject ) {
                if( Array.isArray( productCtxInfo.props.awb0ContextObject.dbValues ) &&
                    !_.isUndefined( productCtxInfo.props.awb0ContextObject.dbValues[ 0 ] ) &&
                    !_.isNull( productCtxInfo.props.awb0ContextObject.dbValues[ 0 ] ) ) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Check if same product being opened as previous
     * @param {Object} contextNameKey Occmgmt context name key
     * @return {Promise} A promise that return the viewer view and context object once resolved
     */
    restorePreviousView( contextNameKey ) {
        let returnPromise = AwPromiseService.instance.defer();
        if( appCtxService.getCtx( 'splitView.viewKeys' ) ) {
            let targetContextKey = appCtxService.getCtx( 'splitView.viewKeys' )[ 1 ];
            if( contextNameKey === targetContextKey ) {
                returnPromise.resolve( [ this._lastViewerCtxObj2, this._lastViewerDivElement2 ] );
                this.updateStructureViewerContextWithVisibility( this._lastViewerCtxObj2, true );
            } else {
                returnPromise.resolve( [ this._lastViewerCtxObj, this._lastViewerDivElement ] );
                this.updateStructureViewerContextWithVisibility( this._lastViewerCtxObj, true );
            }
        } else {
            returnPromise.resolve( [ this._lastViewerCtxObj, this._lastViewerDivElement ] );
            this.updateStructureViewerContextWithVisibility( this._lastViewerCtxObj, true );
        }
        return returnPromise.promise;
    }

    /**
     * Get viewer load input parameters
     *
     * @param {Object} productCtxInfo product context info object
     * @param {Number} viewerWidth desired viewer width
     * @param {Number} viewerHeight desired viewer height
     * @param {Boolean} isShowAll Sets whether or not all geometry should be visible in the 3D scene.
     * @param {Function} securityMarkingHandlerFn explicit security marking handler.
     * @param {Object} contextNameKey Occmgmt context name key
     * @return {Promise} A promise that return the viewer view and context object once resolved
     */
    getViewerLoadInputParameter( productCtxInfo, viewerWidth, viewerHeight, isShowAll,
        securityMarkingHandlerFn, contextNameKey ) {
        var returnPromise = AwPromiseService.instance.defer();
        var viewerLoadInputParams = viewerRenderService.getViewerLoadInputParameters();
        viewerLoadInputParams.setTargetObject( productCtxInfo );
        viewerLoadInputParams.setProductUids( [ productCtxInfo.uid ] );
        viewerLoadInputParams.setViewerContainer( document.createElement( 'div' ) );
        viewerLoadInputParams.setHeight( parseInt( viewerHeight ) );
        viewerLoadInputParams.setWidth( parseInt( viewerWidth ) );
        viewerLoadInputParams.setShowAll( isShowAll );
        viewerLoadInputParams.setSecurityMarkingHandler( securityMarkingHandlerFn );
        viewerLoadInputParams.setViewerCtxNamespace( this.getViewerCtxNamespaceUsingOccmgmtKey( contextNameKey ) );
        viewerLoadInputParams.setApplyBookmarkApplicable( this._isApplyBookmarkApplicable() );
        this._getAdditionalInfo( contextNameKey ).then( ( additionalInfo ) => {
            viewerLoadInputParams.setAdditionalInfo( additionalInfo );
            returnPromise.resolve( viewerLoadInputParams );
        }, ( errorMsg ) => {
            returnPromise.reject( errorMsg );
        } );

        return returnPromise.promise;
    }

    /**
     * Get viewer context namespace based on occmgmt key
     * @param {Object} contextNameKey Occmgmt context name key
     */
    getViewerCtxNamespaceUsingOccmgmtKey( contextNameKey ) {
        if( appCtxService.getCtx( 'splitView.viewKeys' ) ) {
            let targetContextKey = appCtxService.getCtx( 'splitView.viewKeys' )[ 1 ];
            if( targetContextKey && contextNameKey === targetContextKey ) {
                return this._structureCompareSecondViewerNamespace;
            }
        }
        return viewerRenderService.getDefaultViewerNamespace();
    }

    /**
     * Clean up previous view
     * @param {Object} contextNameKey Occmgmt context name key
     */
    cleanUpPreviousView( contextNameKey ) {
        let closeDeferred = AwPromiseService.instance.defer();
        if( appCtxService.getCtx( 'splitView.viewKeys' ) ) {
            let sourceContextKey = appCtxService.getCtx( 'splitView.viewKeys' )[ 0 ];
            let targetContextKey = appCtxService.getCtx( 'splitView.viewKeys' )[ 1 ];
            if( contextNameKey === sourceContextKey ) {
                if( this._lastViewerCtxObj ) {
                    //Reinitialize last product context info and viewer context object to null since viewer associated no longer exists.
                    this._lastViewerCtxObj.close().then( () => {
                        closeDeferred.resolve();
                    } ).catch( () => {
                        closeDeferred.resolve();
                    } );
                    this._lastViewerCtxObj = null;
                    this._lastProductContextInfoObj = null;
                    return closeDeferred.promise;
                }
            } else if( contextNameKey === targetContextKey ) {
                if( this._lastViewerCtxObj2 ) {
                    //Reinitialize last product context info and viewer context object to null since viewer associated no longer exists.
                    this._lastViewerCtxObj2.close().then( () => {
                        closeDeferred.resolve();
                    } ).catch( () => {
                        closeDeferred.resolve();
                    } );
                    this._lastViewerCtxObj2 = null;
                    this._lastProductContextInfoObj2 = null;
                    return closeDeferred.promise;
                }
            }
        } else if( contextNameKey === 'occmgmtContext' ) {
            if( this._lastViewerCtxObj ) {
                //Reinitialize last product context info and viewer context object to null since viewer associated no longer exists.
                this._lastViewerCtxObj.close().then( () => {
                    closeDeferred.resolve();
                } ).catch( () => {
                    closeDeferred.resolve();
                } );
                this._lastViewerCtxObj = null;
                this._lastProductContextInfoObj = null;
                return closeDeferred.promise;
            }
        }

        return AwPromiseService.instance.resolve();
    }

    /**
     * Get viewer view
     *
     * @param {Object} viewerLoadInputParams desired viewer height
     * @param {String} contextNameKey Occmgmt context name key
     * @return {Promise} A promise that return the viewer view and context object once resolved
     */
    getViewerView( viewerLoadInputParams, contextNameKey ) {
        var returnPromise = AwPromiseService.instance.defer();
        var productCtxInfo = viewerLoadInputParams.getTargetObject();
        var viewerloadPromise = viewerRenderService.loadByModelObjectInputParam( viewerLoadInputParams );
        viewerloadPromise.then( ( viewerData ) => {
            if( appCtxService.getCtx( 'splitView.viewKeys' ) ) {
                let sourceContextKey = appCtxService.getCtx( 'splitView.viewKeys' )[ 0 ];
                let targetContextKey = appCtxService.getCtx( 'splitView.viewKeys' )[ 1 ];
                if( contextNameKey === sourceContextKey ) {
                    this._lastProductContextInfoObj = productCtxInfo;
                    this._lastViewerCtxObj = viewerData;
                    this._lastViewerDivElement = viewerLoadInputParams.getViewerContainer();
                } else if( contextNameKey === targetContextKey ) {
                    this._lastProductContextInfoObj2 = productCtxInfo;
                    this._lastViewerCtxObj2 = viewerData;
                    this._lastViewerDivElement2 = viewerLoadInputParams.getViewerContainer();
                }
            } else if( contextNameKey === 'occmgmtContext' ) {
                this._lastProductContextInfoObj = productCtxInfo;
                this._lastViewerCtxObj = viewerData;
                this._lastViewerDivElement = viewerLoadInputParams.getViewerContainer();
            }
            returnPromise.resolve( [ viewerData, viewerLoadInputParams.getViewerContainer() ] );
        }, ( errorMsg ) => {
            returnPromise.reject( errorMsg );
        } );
        return returnPromise.promise;
    }

    /**
     * Gets additional info for the product
     * @param {Object} occmgmtContextNameKey Occmgmt context name key
     * @returns {Object} Object containing additional information to load viewer view correctly
     */
    _getAdditionalInfo( occmgmtContextNameKey ) {
        var additionalInfo = {
            OVERRIDE_VisDoc_Type: 'PRODUCT',
            TransientDoc: 'True'
        };

        // Eventaully server will have to support MMV for all product types. So code for additional info below is short lived.
        var deferredAdditionalInfo = AwPromiseService.instance.defer();
        var occmgmtCtx = appCtxService.getCtx( occmgmtContextNameKey );
        additionalInfo.isFilteredProduct = _.isEmpty( occmgmtCtx.recipe ) ? 'False' : 'True';
        if( !occmgmtCtx.openedElement.props.awb0UnderlyingObjectType ) {
            dataManagementService.getProperties( [ occmgmtCtx.openedElement.uid ], [ 'awb0UnderlyingObjectType' ] )
                .then( () => {
                    if( occmgmtCtx.openedElement.props.awb0UnderlyingObjectType ) {
                        additionalInfo.underlyingObjectType = occmgmtCtx.openedElement.props.awb0UnderlyingObjectType.dbValues[ 0 ];
                    } else {
                        additionalInfo.underlyingObjectType = undefined;
                    }
                    deferredAdditionalInfo.resolve( additionalInfo );
                }, () => {
                    additionalInfo.underlyingObjectType = undefined;
                    deferredAdditionalInfo.resolve( additionalInfo );
                } );
        } else {
            additionalInfo.underlyingObjectType = occmgmtCtx.openedElement.props.awb0UnderlyingObjectType.dbValues[ 0 ];
            deferredAdditionalInfo.resolve( additionalInfo );
        }

        return deferredAdditionalInfo.promise;
    }

    /**
     * Set viewer visibility in viewer application context
     *
     * @param {ViewerContextData} viewerCtxData viewer context data
     * @param {Boolean} isViewerVisible true if viewer is visible
     */
    updateStructureViewerContextWithVisibility( viewerCtxData, isViewerVisible ) {
        viewerRenderService.updateViewerContextWithVisibility( viewerCtxData, isViewerVisible );
    }

    /**
     * Set viewer visibility in viewer application context
     *
     * @param {String} viewerCtxNamespace viewer context name space
     * @param {Boolean} isViewerVisible true if viewer is visible
     */
    updateStructureViewerVisibility( viewerCtxNamespace, isViewerVisible ) {
        viewerRenderService.updateViewerVisibility( viewerCtxNamespace, isViewerVisible );
    }

    /**
     * Ensure pandatory properties for Csids are loaded
     *
     * @param {Array} modelObjects list of model objects
     * @returns {Promise} returns promise that is resolved after loading required properties
     */
    ensureMandatoryPropertiesForCsidLoaded( modelObjects ) {
        var uidsToLoad = [];
        if( modelObjects && modelObjects.length > 0 ) {
            for( var index = 0; index < modelObjects.length; index++ ) {
                var props = modelObjects[ index ].props;
                if( !props.awb0Parent || !props.awb0CopyStableId ) {
                    uidsToLoad.push( modelObjects[ index ].uid );
                }
            }
        }
        if( uidsToLoad.length > 0 ) {
            return dataManagementService.getProperties( uidsToLoad, [ 'awb0Parent', 'awb0CopyStableId' ] );
        }
        return AwPromiseService.instance.resolve( modelObjects );
    }

    /**
     * Update the visibility of the selection commands menu in viewer
     *
     * @param {ViewerContextData} viewerCtxData viewer context data
     */
    updateViewerSelectionCommandsVisibility( viewerCtxData ) {
        var selectedCSIDsInViewer = viewerCtxData.getSelectionManager().getSelectedCsids();
        var invisibleCSIDsInViewer = viewerCtxData.getVisibilityManager().getInvisibleCsids();
        var invisibleExceptionCSIDsInViewer = viewerCtxData.getVisibilityManager().getInvisibleExceptionCsids();

        var setSelectedOnVisible = false;
        var setSelectedOffVisible = false;
        var setContextOnVisible = false;

        if( _.isArray( selectedCSIDsInViewer ) && selectedCSIDsInViewer.length ) {
            if( _.isArray( invisibleCSIDsInViewer ) && invisibleCSIDsInViewer.length ) {
                if( !_.includes( invisibleCSIDsInViewer, '' ) ) {
                    for( var i = 0; i < selectedCSIDsInViewer.length; i++ ) {
                        if( _.includes( invisibleCSIDsInViewer, selectedCSIDsInViewer[ i ] ) ) {
                            setSelectedOnVisible = true;
                            break;
                        }
                    }
                    var selectedVisibleArray = _.difference( selectedCSIDsInViewer, invisibleCSIDsInViewer );

                    if( selectedVisibleArray && selectedVisibleArray.length !== 0 ) {
                        setSelectedOffVisible = true;
                    }
                } else {
                    setSelectedOnVisible = true;

                    if( _.isArray( invisibleExceptionCSIDsInViewer ) && invisibleExceptionCSIDsInViewer.length > 0 ) {
                        var selectedInVisibleArray = _.difference( selectedCSIDsInViewer,
                            invisibleExceptionCSIDsInViewer );

                        if( selectedInVisibleArray && selectedInVisibleArray.length === 0 ) {
                            setSelectedOnVisible = false;
                        }

                        for( var j = 0; j < selectedCSIDsInViewer.length; j++ ) {
                            if( _.includes( invisibleExceptionCSIDsInViewer, selectedCSIDsInViewer[ j ] ) ) {
                                setSelectedOffVisible = true;
                                break;
                            }
                        }
                    }
                }

                var currentProdCtxCsid = objectToCSIDGeneratorService.getCloneStableIdChain( this.getCurrentProductContext( viewerCtxData ) );

                if( _.isArray( selectedCSIDsInViewer ) && selectedCSIDsInViewer.length === 1 &&
                    selectedCSIDsInViewer[ 0 ] === currentProdCtxCsid ) {
                    for( var i = 0; i < invisibleCSIDsInViewer.length; i++ ) {
                        if( invisibleCSIDsInViewer[ i ].startsWith( currentProdCtxCsid ) ) {
                            setContextOnVisible = true;
                            break;
                        }
                    }
                }
            } else {
                setSelectedOffVisible = true;
            }
        }

        viewerCtxData.updateSelectedOnCommandVisibility( setSelectedOnVisible );
        viewerCtxData.updateSelectedOffCommandVisibility( setSelectedOffVisible );
        viewerCtxData.updateContextOnCommandVisibility( setContextOnVisible );
    }

    /**
     * Get current product context
     * @param {ViewerContextData} viewerCtxData viewer context data
     * @returns {Object} Current root object
     */
    getCurrentProductContext( viewerCtxData ) {
        var viewerCurrentProductContext = viewerCtxData.getCurrentViewerProductContext();
        if( viewerCurrentProductContext && viewerCurrentProductContext.modelType.typeHierarchyArray.indexOf( 'Awb0SavedBookmark' ) !== -1 ) {
            let occmgmtContextFromViewerContext = this.getOccmgmtContextFromViewerContext( viewerCtxData.getViewerCtxNamespace() );
            if( !occmgmtContextFromViewerContext ) {
                logger.error( 'Could not get occmgmtContext object for viewer context : ' +
                    viewerCtxData.getViewerCtxNamespace() + ' and occmgmtContext key : ' +
                    this.getOccmgmtContextNameKeyFromViewerContext( viewerCtxData.getViewerCtxNamespace() ) );
                return viewerCurrentProductContext;
            }
            var pciModelObj = occmgmtContextFromViewerContext.productContextInfo;
            var elementToPCIMap = occmgmtContextFromViewerContext.elementToPCIMap;
            if( elementToPCIMap && pciModelObj ) {
                for( var prop in elementToPCIMap ) {
                    if( elementToPCIMap.hasOwnProperty( prop ) && elementToPCIMap[ prop ] && elementToPCIMap[ prop ] === pciModelObj.uid ) {
                        return cdm.getObject( prop );
                    }
                }
            }
        }
        return viewerCurrentProductContext;
    }

    /**
     * Function returns alternate PCI object if available, otherwise returns main PCI object.
     * In 4G case, alternate PCI is set as workset PCI to avoid unnecessary refresh.
     *
     * @param {String} occmgmtContextNameKey Occmgmt context name key
     * @returns {pciModelObj} .
     */
    getPCIModelObject( occmgmtContextNameKey ) {
        var pciModelObj = this.getViewerPCIToBeLoaded( occmgmtContextNameKey );
        if( pciModelObj.props.awb0AlternateConfiguration ) {
            let alternatePCIUid = pciModelObj.props.awb0AlternateConfiguration.dbValues[ 0 ];
            var pref = viewerPreferenceService.getUseAlternatePCIPreference();
            if( !pref || pref === 'INDEXED' ) {
                if( this.hasAlternatePCI( pciModelObj ) ) {
                    return cdm.getObject( alternatePCIUid );
                }
            }
        }
        return pciModelObj;
    }

    /**
     * Function returns alternate PCI object if available, otherwise returns main PCI object.
     * In 4G case, alternate PCI is set as workset PCI to avoid unnecessary refresh.
     *
     * @param {String} occmgmtContextNameKey Occmgmt context name key
     * @returns {pciModelObj} .
     */
    getViewerPCIToBeLoaded( occmgmtContextNameKey ) {
        let occmgmtContext = appCtxService.getCtx( occmgmtContextNameKey );
        if( occmgmtContext.elementToPCIMap && occmgmtContext.rootElement ) {
            return cdm.getObject( occmgmtContext.elementToPCIMap[ occmgmtContext.rootElement.uid ] );
        }
        return occmgmtContext.productContextInfo;
    }

    /**
     * Check product has Alternate PCI
     *
     * @param {Object} pciModelObj PCI model object
     *
     * @return {boolean} boolean result
     */
    hasAlternatePCI( pciModelObj ) {
        if( pciModelObj.props.awb0AlternateConfiguration ) {
            var alternatePCIUid = pciModelObj.props.awb0AlternateConfiguration.dbValues[ 0 ];
            return !_.isNull( alternatePCIUid ) && !_.isUndefined( alternatePCIUid ) && !_.isEmpty( alternatePCIUid );
        }
        return false;
    }

    /**
     * Register event for filter change and reset event
     */
    registerFilterReloadEvent() {
        if( !this._primaryWorkAreaContentReloadEvent ) {
            this._primaryWorkAreaContentReloadEvent = eventBus.subscribe( 'primaryWorkArea.contentsReloaded', () => {
                this._isFilterApplied = false;
            }, 'structureViewerService' );
        }
        if( !this._resetFilterEvent ) {
            this._resetFilterEvent = eventBus.subscribe( 'productContextChangedEvent', ( eventData ) => {
                var aceContext = appCtxService.getCtx( eventData.updatedView );
                if( aceContext && aceContext.requestPref && aceContext.requestPref.recipeReset === 'true' ) {
                    this.setIsFilterApplied( false );
                }
            }, 'structureViewerService' );
        }
    }

    /**
     * Register event for save session
     */
    registerAceSaveSessionSuccessEvent() {
        if( !this._aceSaveSessionSuccessEvent ) {
            this._aceSaveSessionSuccessEvent = eventBus.subscribe( 'ace.saveSessionSuccess', () => {
                let occmgmtActiveContext = appCtxService.getCtx( 'aceActiveContext' );
                this.updateVisSession( occmgmtActiveContext && occmgmtActiveContext.key ? occmgmtActiveContext.key :
                    'occmgmtContext' );
            }, 'structureViewerService' );
        }
    }

    /**
     * Register event for reset structure
     */
    registerAceResetStructureEvent() {
        if( !this._aceResetStructureStartedListener ) {
            this._aceResetStructureStartedListener = eventBus.subscribe( 'ace.resetStructureStarted', ( eventData ) => {
                let currentPCI = appCtxService.getCtx( eventData.scope.ctx.aceActiveContext && eventData.scope.ctx.aceActiveContext.key ?
                    eventData.scope.ctx.aceActiveContext.key : 'occmgmtContext' ).productContextInfo;
                if( !_.includes( this._aceResetState, currentPCI.uid ) ) {
                    this._aceResetState.push( currentPCI.uid );
                }
                var activeToolAndInfoCmd = appCtxService.getCtx( 'activeToolsAndInfoCommand' );
                if( activeToolAndInfoCmd && activeToolAndInfoCmd.commandId ) {
                    eventBus.publish( 'awsidenav.openClose', {
                        id: 'aw_toolsAndInfo',
                        commandId: activeToolAndInfoCmd.commandId
                    } );
                }
            }, 'structureViewerService' );
        }
    }

    /**
     * Check if reset was performed on currect pci
     * @param occmgmtContextNameKey Occmgmt context name key
     */
    checkIfResetWasPerformedOnPci( occmgmtContextNameKey ) {
        let productCtxInfo = appCtxService.getCtx( occmgmtContextNameKey ).productContextInfo;
        return _.includes( this._aceResetState, productCtxInfo.uid );
    }

    /**
     * Clean up the vf file ticket in auto bookmark
     * @param occmgmtContextNameKey Occmgmt context name key
     */
    cleanupAutoBookmark( occmgmtContextNameKey ) {
        let productCtxInfo = appCtxService.getCtx( occmgmtContextNameKey ).productContextInfo;
        _.pull( this._aceResetState, productCtxInfo.uid );
        return soaSvc.postUnchecked( 'Internal-ActiveWorkspaceVis-2014-11-OccurrenceManagement', 'saveVisBookmarkInfo', {
            saveBookmarkInfos: [ {
                productContextInfo: productCtxInfo,
                visBookmarkTransientFileTicket: ''
            } ]
        } );
    }

    /**
     * Un-register event for save session
     */
    deregisterAceSaveSessionSuccessEvent() {
        if( this._aceSaveSessionSuccessEvent ) {
            eventBus.unsubscribe( this._aceSaveSessionSuccessEvent );
        }
        this._aceSaveSessionSuccessEvent = null;
    }

    /**
     * Update isFilterApplied to false for filter reset to reload the viewer
     */
    setIsFilterApplied( isFilterApplied ) {
        this._isFilterApplied = isFilterApplied;
    }

    /**
     * Un-register event for filter chnage and reset event
     */
    deregisterFilterReloadEvent() {
        if( this._primaryWorkAreaContentReloadEvent ) {
            eventBus.unsubscribe( this._primaryWorkAreaContentReloadEvent );
        }
        if( this._resetFilterEvent ) {
            eventBus.unsubscribe( this._resetFilterEvent );
        }
        this._primaryWorkAreaContentReloadEvent = null;
        this._resetFilterEvent = null;
        this._isFilterApplied = true;
    }

    /**
     * Register App Session Save As listener 124
     */
    _registerAppSessionSaveAsListener124() {
        let self = this;
        if( self._appSessionSaveAsStaredListener === null ) {
            self._appSessionSaveAsStaredListener = eventBus.subscribe( 'Awb0SaveAsSession.contentLoaded', () => {
                if( self._lastViewerCtxObj && !self._lastViewerCtxObj.isConnectionClosed() ) {
                    self._lastViewerCtxObj.getSessionMgr().saveAutoBookmark();
                }
            }, 'structureViewerService' );
        }
    }

    /**
     * Register App Session creation listener 124
     */
    _registerAppSessionCreationListener124() {
        let self = this;
        if( self._appSessionCreateStaredListener === null ) {
            self._appSessionCreateStaredListener = eventBus.subscribe( 'Awb0CreateSession.contentLoaded', () => {
                if( self._lastViewerCtxObj && !self._lastViewerCtxObj.isConnectionClosed() ) {
                    self._lastViewerCtxObj.getSessionMgr().saveAutoBookmark();
                }
            }, 'structureViewerService' );
        }
    }

    /**
     * Register App Session Save As listener
     */
    _registerAppSessionSaveAsListener() {
        let self = this;
        if( self._appSessionSaveAsStaredListener === null ) {
            self._appSessionSaveAsStaredListener = eventBus.subscribe( 'Awb0SaveAsSession.contentLoaded', () => {
                //Call Save ABKM emm here. This will ensure that the current state of viewer is persisted in current session
                //visautobookmark data.
                if( self._lastViewerCtxObj && !self._lastViewerCtxObj.isConnectionClosed() ) {
                    self._lastViewerCtxObj.getSessionMgr().saveAutoBookmark();
                }
                let occmgmtActiveContext = appCtxService.getCtx( 'aceActiveContext' );
                let currentPCI = self.getPCIModelObject( occmgmtActiveContext && occmgmtActiveContext.key ?
                    occmgmtActiveContext.key : 'occmgmtContext' );
                let is3DActiveForThisSession = self._lastProductContextInfoObj && currentPCI && self._lastProductContextInfoObj.uid === currentPCI.uid;
                if( is3DActiveForThisSession && self._appSessionSaveAsListener === null ) {
                    self._appSessionSaveAsListener = eventBus.subscribe( 'cdm.created', ( eventData ) => {
                        if( eventData && Array.isArray( eventData.createdObjects ) &&
                            eventData.createdObjects.length > 0 ) {
                            _.forEach( eventData.createdObjects, createdObject => {
                                if( createdObject.type === 'Fnd0AppSession' ) {
                                    self._retain3DforAppSessionCreation = true;
                                    self._registerProductContextInfoChangedListener();
                                }
                            } );
                        }
                        eventBus.unsubscribe( self._appSessionSaveAsListener );
                        self._appSessionSaveAsListener = null;
                    }, 'structureViewerService' );
                }
            }, 'structureViewerService' );
        }

        if( self._appSessionSaveAsStoppedListener === null ) {
            self._appSessionSaveAsStoppedListener = eventBus.subscribe( 'Awb0SaveAsSession.contentUnloaded', () => {
                if( self._appSessionSaveAsListener ) {
                    eventBus.unsubscribe( self._appSessionSaveAsListener );
                    self._appSessionSaveAsListener = null;
                }
            }, 'structureViewerService' );
        }
    }

    /**
     * Register App Session creation listener
     */
    _registerAppSessionCreationListener() {
        let self = this;
        if( self._appSessionCreateStaredListener === null ) {
            self._appSessionCreateStaredListener = eventBus.subscribe( 'Awb0CreateSession.contentLoaded', () => {
                let occmgmtActiveContext = appCtxService.getCtx( 'aceActiveContext' );
                let currentPCI = self.getPCIModelObject( occmgmtActiveContext && occmgmtActiveContext.key ?
                    occmgmtActiveContext.key : 'occmgmtContext' );
                let is3DActiveForThisSession = self._lastProductContextInfoObj && currentPCI &&
                    self._lastProductContextInfoObj.props.awb0Product.dbValues[ 0 ] === currentPCI.props.awb0Product.dbValues[ 0 ];
                if( self._lastViewerCtxObj && !self._lastViewerCtxObj.isConnectionClosed() ) {
                    self._lastViewerCtxObj.getSessionMgr().saveAutoBookmark();
                }
                if( is3DActiveForThisSession && self._appSessionCreatedListener === null ) {
                    self._appSessionCreatedListener = eventBus.subscribe( 'cdm.created', ( eventData ) => {
                        if( eventData && Array.isArray( eventData.createdObjects ) &&
                            eventData.createdObjects.length > 0 &&
                            eventData.createdObjects[ 0 ].type === 'Fnd0AppSession' ) {
                            self._retain3DforAppSessionCreation = true;
                            self._registerProductContextInfoChangedListener();
                        }
                        eventBus.unsubscribe( self._appSessionCreatedListener );
                        self._appSessionCreatedListener = null;
                    }, 'structureViewerService' );
                }
            }, 'structureViewerService' );
        }

        if( self._appSessionCreateStoppedListener === null ) {
            self._appSessionCreateStoppedListener = eventBus.subscribe( 'Awb0CreateSession.contentUnloaded', () => {
                if( self._appSessionCreatedListener ) {
                    eventBus.unsubscribe( self._appSessionCreatedListener );
                    self._appSessionCreatedListener = null;
                }
            }, 'structureViewerService' );
        }
    }

    /**
     * get last modified date
     */
    _getLastModDate( occmgmtContextKey ) {
        let _appSessionObj = appCtxService.getCtx( occmgmtContextKey ).topElement;
        let returnPromise = AwPromiseService.instance.defer();
        if( _appSessionObj && _appSessionObj.type === 'Fnd0AppSession' ) {
            soaSvc.post( 'Core-2007-01-DataManagement', 'refreshObjects', {
                objects: [ _appSessionObj ]
            } ).then( () => {
                dataManagementService.getPropertiesUnchecked( [ _appSessionObj ], [ 'last_mod_date' ] ).then( ( response ) => {
                    returnPromise.resolve( response.modelObjects[ _appSessionObj.uid ].props.last_mod_date.dbValues[ 0 ] );
                }, () => {
                    returnPromise.reject( 'Property is not loaded' );
                } );
            }, () => {
                returnPromise.reject( 'Could not refresh object' );
            } );
        } else {
            returnPromise.resolve( null );
        }
        return returnPromise.promise;
    }

    /**
     * Sync AppSession lsd with autobookmark
     */
    _syncAppSessionLSDWithAutobookmark() {
        let appSessionObj = null;
        let appSessionObjUid = appCtxService.getCtx( 'aceActiveContext.context.workingContextObj.uid' );
        if( !_.isNull( appSessionObjUid ) && !_.isUndefined( appSessionObjUid ) ) {
            appSessionObj = cdm.getObject( appSessionObjUid );
        }
        if( appSessionObj && appSessionObj.type === 'Fnd0AppSession' ) {
            var inputData = {
                input: [ {
                    productInfo: null,
                    workingContext: appSessionObj,
                    saveResult: true,
                    operation: 'SyncLSD'
                } ]
            };
            return soaSvc.post( 'Internal-ActiveWorkspaceBom-2020-05-OccurrenceManagement', 'updateWorkingContext', inputData );
        }
        return AwPromiseService.instance.resolve();
    }

    /**
     * Register product context info changed listener
     */
    _registerProductContextInfoChangedListener() {
        let self = this;
        if( self._productContextInfoChangedEvent === null ) {
            self._productContextInfoChangedEvent = eventBus.subscribe( 'productContextChangedEvent', () => {
                let occmgmtActiveContext = appCtxService.getCtx( 'aceActiveContext' );
                let occmgmtContextKey = occmgmtActiveContext && occmgmtActiveContext.key ? occmgmtActiveContext.key : 'occmgmtContext';
                //The indexed PCI doesn't contain the Awb0StructureRecepie property and hence causes issues while session creation
                //Always pass the non-indexed PCI
                var productCtxInfo = appCtxService.getCtx( occmgmtContextKey ).productContextInfo;
                self._getLastModDate( occmgmtContextKey ).then( ( LMD ) => {
                    if( self.createVisSessionifAppSessionBeingOpened( productCtxInfo, LMD ) ) {
                        //While setting the last PCI set it as per the "Use Indexed" preference so that 3D doesnn't reload.
                        self._lastProductContextInfoObj = self.getPCIModelObject( occmgmtActiveContext && occmgmtActiveContext.key ?
                            occmgmtActiveContext.key : 'occmgmtContext' );
                    }
                } );
                eventBus.unsubscribe( self._productContextInfoChangedEvent );
                self._productContextInfoChangedEvent = null;
            }, 'structureViewerService' );
        }
    }

    /**
     * Register product launch listener
     */
    _registerProductLaunchEventListener() {
        if( this._productLaunchEvent === null ) {
            this._productLaunchEvent = eventBus.subscribe( 'viewer.productLaunchEvent', ( eventData ) => {
                viewerSecondaryModelSvc.saveAutoBookMark( eventData.viewerNamespace ).then( function() {
                    dmSvc.createObjects( [ {
                        data: {
                            boName: 'Fnd0TempAppSession'
                        }
                    } ] ).then( function( createObjectsResponse ) {
                        let tempAppSession = createObjectsResponse.output[ 0 ].objects[ 0 ];
                        let inputData = {
                            input: [ {
                                productInfo: eventData.productLaunchInfo.productContextInfo,
                                workingContext: tempAppSession,
                                saveResult: true,
                                operation: 'create'
                            } ]
                        };

                        soaSvc.post( 'Internal-ActiveWorkspaceBom-2020-05-OccurrenceManagement',
                            'updateWorkingContext', inputData ).then( function() {
                            let productCtxLaunchInfos = [];
                            productCtxLaunchInfos.push( {
                                productContextInfo: tempAppSession,
                                selections: eventData.productLaunchInfo.selections
                            } );
                            createLaunchInfoRequest.launchProduct( eventData.openInHost, eventData.isTohostInVis, productCtxLaunchInfos );
                        } );
                    } );
                } );
            }, 'structureViewerService' );
        }
    }

    /**
     * pop up save as dialog
     */
    _popupSaveAsDialog() {
        //save as
        var buttons = [ {
            addClass: 'btn btn-notify',
            text: localeService.getLoadedText( 'StructureViewerMessages' ).Cancel,
            onClick: function( $noty ) {
                $noty.close();
            }
        }, {
            addClass: 'btn btn-notify',
            text: localeService.getLoadedText( 'StructureViewerMessages' ).Create,
            onClick: function( $noty ) {
                commandPanelService.activateCommandPanel( 'Awb0SaveAsSession', 'aw_toolsAndInfo' );
                $noty.close();
            }
        } ];
        messagingService.showWarning( localeService.getLoadedText( 'StructureViewerMessages' ).Checkout, buttons );
    }

    /**
     * Set if root node has disclosure data
     * @param {String} viewerContextNamespace Viewer context namespace
     * @param {String} rootElementId root element uid
     */
    setHasDisclosureData( viewerContextNamespace, rootElementId ) {
        disclosureService.hasDisclosedModelViewData( rootElementId ).then( ( hasData ) => {
            viewerContextService.updateViewerApplicationContext( viewerContextNamespace,
                viewerContextService.VIEWER_HAS_DISCLOSED_MV_DATA_TOKEN, hasData );
        } );
    }

    /**
     * Is apply bookmark is applicable for session/product
     */
    _isApplyBookmarkApplicable() {
        let occmgmtActiveContext = appCtxService.getCtx( 'aceActiveContext' );
        let applyBookmarkApplicable = true;
        if( occmgmtActiveContext && occmgmtActiveContext.context.isRestoreOptionApplicableForProduct ) {
            applyBookmarkApplicable = occmgmtActiveContext.context.isRestoreOptionApplicableForProduct !== true;
        }
        return applyBookmarkApplicable;
    }
}

/**
 *
 * @memberof NgServices
 * @member structureViewerService
 */
app.factory( 'structureViewerService', () => StructureViewerService.instance );
