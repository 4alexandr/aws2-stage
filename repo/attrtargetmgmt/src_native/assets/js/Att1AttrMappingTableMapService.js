// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Att1AttrMappingTableMapService
 */
import * as app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import msgSvc from 'js/messagingService';
import cmdMapSvc from 'js/commandsMapService';
import localeService from 'js/localeService';
import awTableSvc from 'js/awTableService';
import iconSvc from 'js/iconService';
import soaSvc from 'soa/kernel/soaService';
import policySvc from 'soa/kernel/propertyPolicyService';
import attrTableCreateSvc from 'js/Att1AttrMappingTableCreateService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import parsingUtils from 'js/parsingUtils';

var exports = {};

var _mappingTableContextName = 'Att1ShowMappedAttribute';
var _vmc = null;

/**
 * @param {Object} contextObject the context
 * @returns {boolean} true if the contextObejct is valid and Modifiable
 */
function _isContextModifiable( contextObject ) {
    var inContextWritable = false;
    if( contextObject && contextObject.props && contextObject.props.is_modifiable.dbValues[ 0 ] === '1' ) {
        inContextWritable = true;
    }
    return inContextWritable;
}

/**
 * @param {Array} object the array
 * @returns {boolean} true if the array is populated
 */
function _isArrayPopulated( object ) {
    var isPopulated = false;
    if( object && object.length > 0 ) {
        isPopulated = true;
    }
    return isPopulated;
}

/**
 * @param {Object} contextObject the context
 * @returns {boolean} true if the context is modifiable
 */
function _getIsContextModifiable( contextObject ) {
    var isModifiable = false;
    if( contextObject ) {
        isModifiable = _isContextModifiable( cdm.getObject( contextObject ) );
    }
    return isModifiable;
}

/**
 * @param {Array} inputList the array of inputs
 * @param {Object} contextObject the context
 * @returns {Object} the input object
 */
function _getAttrInput( inputList, contextObject ) {
    var input = null;
    for( var i = 0; i < inputList.length; ++i ) {
        if( inputList[ i ].clientId === contextObject ) {
            input = inputList[ i ];
        }
    }
    return input;
}

/**
 * Get the selected element and attributes for the mapMeasurableAttributes2 SOA
 *
 * @returns {Array} the array of ElementAttrMapInput objects
 */
function _getAutomapSourceObjAndAttrs() {
    var selectedAttrVMTNs = appCtxSvc.getCtx( 'selectedProxyObjects' );
    var selectedElements = [];
    var attrInputsByElement = {};
    var attrInputs = [];

    // if there are selected attributes we have to add them to the proper attrInput
    if( selectedAttrVMTNs && selectedAttrVMTNs.length > 0 ) {
        var alignmentObjs = appCtxSvc.getCtx( 'selectedAlignmentObjects' );

        _.forEach( selectedAttrVMTNs, function( selectedAttrVMTN ) {
            var selectedAttrProxy = cdm.getObject( selectedAttrVMTN.uid );

            if( alignmentObjs ) {
                for( var a = 0; a < alignmentObjs.length; a++ ) {
                    if( selectedAttrProxy.props.att1AttributeAlignment.dbValues[ 0 ] === alignmentObjs[ a ].uid ) {
                        // not top-level, exclude
                        return;
                    }
                }
            }

            // find the attrInput for the source element
            var selectedElementUid = selectedAttrVMTN.props.att1SourceElement.dbValues[ 0 ];
            var selectedElement = cdm.getObject( selectedElementUid );

            var attrInput = null;

            for( var sourceElementName in attrInputsByElement ) {
                if( sourceElementName === selectedElementUid ) {
                    attrInput = attrInputsByElement[ sourceElementName ];
                    break;
                }
            }

            // if not found, add a new one
            if( attrInput === null ) {
                attrInput = {
                    sourceElement: selectedElement,
                    attributes: []
                };
                attrInputsByElement[ selectedElementUid ] = attrInput;
            }

            // add the selected attribute to attrInput
            var selectedAttr = cdm.getObject( selectedAttrProxy.props.att1SourceAttribute.dbValues[ 0 ] );
            attrInput.attributes.push( selectedAttr );
        } );
    } else {
        // selected elements can be retrieved from occmgmtCtx
        var occMgtCtx = appCtxSvc.getCtx( 'occmgmtContext' );
        var selectedElementUids = occMgtCtx.pwaSelectionModel.getSelection();
        _.forEach( selectedElementUids, function( selectedElementUid ) {
            var selectedElement = cdm.getObject( selectedElementUid );
            selectedElements.push( selectedElement );
        } );

        // for each selected element, put an attrInput in attrInputsByElement
        // index the elements by name so we can match them with their attributes if any are selected
        _.forEach( selectedElements, function( selectedElement ) {
            var attrInput = {
                sourceElement: selectedElement,
                attributes: []
            };
            var elementName = selectedElement.uid;
            attrInputsByElement[ elementName ] = attrInput;
        } );
    }

    for( var elementName in attrInputsByElement ) {
        if( attrInputsByElement.hasOwnProperty( elementName ) ) {
            attrInputs.push( attrInputsByElement[ elementName ] );
        }
    }

    return attrInputs;
}

/**
 * Get the root element for the mapMeasurableAttributes2 SOA input
 *
 * @returns {Object} the rootElement object
 */
function _getAutomapRootObject() {
    // get the root object
    var prodCtx = appCtxSvc.getCtx( 'occmgmtContext' );
    var autoMapRootObj = [];

    if( prodCtx.elementToPCIMap ) {
        var uids = Object.keys( prodCtx.elementToPCIMap );
        for( var i in uids ) {
            autoMapRootObj.push( cdm.getObject( uids[ i ] ) );
        }
    }

    if( autoMapRootObj.length === 0 ) {
        autoMapRootObj.push( prodCtx.topElement );
    }

    return autoMapRootObj;
}

/**
 * Get the product context for the mapMeasurableAttributes2 SOA input
 *
 * @returns {Object} the Awb0ProductContextInfo object
 */
function _getAutomapProductCtx() {
    // get the product context info
    var prodCtx = appCtxSvc.getCtx( 'occmgmtContext' );
    var autoMapProdCtx = [];

    if( prodCtx.elementToPCIMap ) {
        for( var i in prodCtx.elementToPCIMap ) {
            if( prodCtx.elementToPCIMap.hasOwnProperty( i ) ) {
                autoMapProdCtx.push( cdm.getObject( prodCtx.elementToPCIMap[ i ] ) );
            }
        }
    }

    if( autoMapProdCtx.length === 0 ) {
        autoMapProdCtx.push( prodCtx.productContextInfo );
    }

    return autoMapProdCtx;
}

/**
 * Get the attributes for the mapMeasurableAttributes2 SOA input
 *
 * @returns {Array} the array of MapMeasurableAttrInput2 objects
 */
export let getAutomapInputs = function() {
    // get the source object & selected attrs
    var attrInputs = _getAutomapSourceObjAndAttrs();

    // get the product info
    var autoMapRootObj = _getAutomapRootObject();
    var autoMapProductCtx = _getAutomapProductCtx();

    var productInfos = [];
    if( autoMapRootObj.lenght === autoMapProductCtx.lenght ) {
        for( var i in autoMapRootObj ) {
            var obj = {
                rootElement: autoMapRootObj[ i ],
                productContext: autoMapProductCtx[ i ]
            };

            productInfos.push( obj );
        }
    }

    // create the input object
    var inputs = [ {
        clientId: 'Att1AttributeMappingService',
        elements: attrInputs,
        productInfo: productInfos
    } ];

    return inputs;
};

/**
 * Get the preferences for the mapMeasurableAttributes2 SOA input
 *
 * @returns {Object} the MapMeasurableAttrPref2 object
 */
export let getAutomapPrefs = function() {
    var prefs = {
        mapObjType: '',
        alignmentObjType: ''
    };
    return prefs;
};

/**
 * Evaluate the automap response to see which message to display to the user
 *
 * @param {Object} data the data object
 * @returns {boolean} true if the attribute mapping table should be refreshed
 */
export let evaluateAutomapResults = function( data ) {
    var automapResponse = data.outputs[ 0 ];
    var automapResponseKey = 'autoMappingNoMappingsMsg';
    var refreshTable = false;

    if( !automapResponse || !automapResponse.elementAttrOutputs ||
        automapResponse.elementAttrOutputs.length === 0 ) {
        // no trace link to/from source element
        automapResponseKey = 'autoMappingNoTraceLinksMsg';
    } else {
        var elementAttrOutputs = automapResponse.elementAttrOutputs;
        for( var idx = 0; idx < elementAttrOutputs.length; idx++ ) {
            // if any of the attrMapOutputs have an attrAlignments array, something was mapped
            var attrMapOutputs = elementAttrOutputs[ idx ].attrMapOutputs;

            for( var jdx = 0; jdx < attrMapOutputs.length; jdx++ ) {
                if( attrMapOutputs[ jdx ].attrAlignments.length > 0 ) {
                    automapResponseKey = 'autoMappingSucceededMsg';
                    refreshTable = true;
                    break;
                }
            }

            if( refreshTable ) {
                break;
            }
        }
    }

    // display message
    var resource = 'Att1AttrMappingMessages';
    var localTextBundle = localeService.getLoadedText( resource );
    var automapResponseMessage = localTextBundle[ automapResponseKey ];
    msgSvc.showInfo( automapResponseMessage );

    // return output
    return refreshTable;
};

/**
 * Map measurable attributes
 *
 * @param {Array} inputProxyObjects The input attribute
 * @param {Array} selectedProxyObjects The selected proxy objects
 */
export let mapAttributes = function( inputProxyObjects, selectedProxyObjects ) {
    var inputAttr = '';
    if( _isArrayPopulated( inputProxyObjects ) ) {
        inputAttr = inputProxyObjects[ 0 ].props.att1SourceAttribute.dbValue;
    }

    var nonModifiableList = [];
    if( _isArrayPopulated( selectedProxyObjects ) && inputAttr ) {
        var inputList = [];
        for( var idx = 0; idx < selectedProxyObjects.length; ++idx ) {
            var selectedObj = selectedProxyObjects[ idx ];
            var direction = selectedObj.props.att1SourceDirection.dbValue;
            var contextObject = selectedObj.props.att1ContextObject.dbValue;
            var isModifiable = _getIsContextModifiable( contextObject );
            var input = _getAttrInput( inputList, contextObject );

            var attrAlignment;
            var selectedAttr = selectedObj.props.att1SourceAttribute.dbValue;
            if( direction === 'source' || direction === 'Defining' ) {
                attrAlignment = {
                    sourceObj: cdm.getObject( selectedAttr ),
                    targetObj: cdm.getObject( inputAttr )
                };
            } else {
                attrAlignment = {
                    sourceObj: cdm.getObject( inputAttr ),
                    targetObj: cdm.getObject( selectedAttr )
                };
            }

            // The trace link is not modifiable, add the selected to Attribute to the failure list.
            if( !isModifiable ) {
                nonModifiableList.push( selectedObj.props.att1SourceAttribute.displayValues[ 0 ] );
                continue;
            }

            if( input ) {
                input.alignmentInputs.push( attrAlignment );
            } else {
                input = {
                    clientId: contextObject,
                    contextObj: cdm.getObject( contextObject ),
                    alignmentInputs: [ attrAlignment ]
                };
                inputList.push( input );
            }
        }

        appCtxSvc.registerCtx( 'mapObjectAttributeInput', inputList );

        var nonModifialbleAttributesList = {
            nonModifialbleAttributesList: {
                length: nonModifiableList.length,
                number_selected: selectedProxyObjects.length,
                AttributeNames: nonModifiableList
            }
        };

        appCtxSvc.registerCtx( 'nonMappableObjects', nonModifialbleAttributesList );

        eventBus.publish( 'Att1MapAttribute.mapAttributesSOA' );
    }
};

export let onSublocationSelectionChange = function( eventData ) {
    // On a sublocation selection change, only close the map panel if the selected
    //  object is not a row in the mapping table
    if( eventData && eventData.selected && ( eventData.selected.length === 0 ||
            !cmdMapSvc.isInstanceOf( 'Att1AttributeAlignmentProxy', eventData.selected[ 0 ].modelType ) ) ) {
        eventBus.publish( 'closeMapAttribPanel' );
    }
};

/**
 * set the pin on the data
 *
 * @param {Object} data - the view model data
 */
export let setPinMapAttrPanel = function( data ) {
    data.pinnedToForm.dbValue = false;
    data.unpinnedToForm.dbValue = true;
    eventBus.publish( 'Att1MapAttribute.pinnedToForm', {
        pinnedToForm: true
    } );
};

/**
 * set unpin on the data
 *
 * @param {Object} data - the view model data
 */
export let setUnPinMapAttrPanel = function( data ) {
    data.pinnedToForm.dbValue = true;
    data.unpinnedToForm.dbValue = false;
    eventBus.publish( 'Att1MapAttribute.pinnedToForm', {
        pinnedToForm: false
    } );
};

/**
 * @param {ViewModelObject} targetVMO the mapped attribute VMO to be added to the table
 * @param {int} childNdx the table index to insert the new node at
 * @param {int} levelNdx the indent index of the new node
 * @returns {ViewModelObject} the new node to inesrt into the table
 */
function _createVMNodeForMappedAttr( targetVMO, childNdx, levelNdx ) {
    var occUid = targetVMO.uid;
    var occType = targetVMO.type;
    var displayName = targetVMO.props.att1SourceAttribute.uiValues[ 0 ];
    var iconURL = iconSvc.getTypeIconURL( occType );
    var hasChildren = targetVMO.props.att1HasChildren && targetVMO.props.att1HasChildren.dbValues[ 0 ] === '1';

    var vmNode = awTableSvc.createViewModelTreeNode( occUid, occType, displayName, levelNdx, childNdx, iconURL );
    vmNode.isLeaf = !hasChildren;

    return vmNode;
}

/**
 * @param {ViewModelObject} parentVMO the parent VMO
 * @param {int} parentIdx the index of the parentVMO in the table
 * @param {ViewModelObject} targetVMO the mapped attribute VMO to be added to the table
 */
function _insertNewMappedAttribute( parentVMO, parentIdx, targetVMO ) {
    var childIdx = parentVMO.children.length;
    var childlevelIndex = parentVMO.levelNdx + 1;

    //Create the viewModelTreeNode from the child ModelObject, child index and level index
    var childVMO = _createVMNodeForMappedAttr( targetVMO, childIdx, childlevelIndex );

    //Add the new treeNode to the parentVMO (if one exists) children array
    parentVMO.children.push( childVMO );
    parentVMO.totalChildCount = parentVMO.children.length;

    //See if we have any expanded children to skip over in the viewModelCollection
    var numFirstLevelChildren = 0;
    for( var i = parentIdx + 1; i < _vmc.loadedVMObjects.length; i++ ) {
        if( numFirstLevelChildren === childIdx && _vmc.loadedVMObjects[ i ].levelNdx <= childlevelIndex ) {
            break;
        }
        if( _vmc.loadedVMObjects[ i ].levelNdx === childlevelIndex ) {
            numFirstLevelChildren++;
        }
        if( _vmc.loadedVMObjects[ i ].levelNdx < childlevelIndex ) {
            // no longer looking at first level children (now looking at an uncle)
            break;
        }
    }
    var newIndex = i;

    // insert the new treeNode in the viewModelCollection at the correct location
    _vmc.loadedVMObjects.splice( newIndex, 0, childVMO );
}

/**
 * @param {Array} viewModelObjects the parent
 * @param {ViewModelObject} targetVMO the child
 * @returns {int} the index of the child, or -1
 */
function _findIndexOfProxyByUid( viewModelObjects, targetVMO ) {
    return _.findLastIndex( viewModelObjects, function( vmo ) {
        return vmo.uid === targetVMO.uid;
    } );
}

/**
 * @param {ViewModelObject} parentVMO the parent VMO
 * @param {Array} proxyObjects the proxy objects
 */
function _addMappedAttrProxyObjectsToTable( parentVMO, proxyObjects ) {
    var otherMappedAttrNodes = [];
    var vmo = null;

    // Look for other instances of the mapped attributes in the table. We need to mark those nodes as
    //  non-leaf nodes, but we will not expand them.
    for( var i = 0; i < proxyObjects.length; ++i ) {
        for( var j = 0; j < _vmc.loadedVMObjects.length; ++j ) {
            // get the VMOs for proxy objects that have the same source as the mapped attributes
            vmo = _vmc.loadedVMObjects[ j ];
            if( vmo.props && vmo.props.att1SourceAttribute.dbValues[ 0 ] === proxyObjects[ i ].props.att1SourceAttribute.dbValues[ 0 ] &&
                vmo.props.att1SourceElement.dbValues[ 0 ] === proxyObjects[ i ].props.att1SourceElement.dbValues[ 0 ] ) {
                otherMappedAttrNodes.push( vmo );
            }
        }
    }

    // Mark these other nodes as non-leafs
    for( i = 0; i < otherMappedAttrNodes.length; ++i ) {
        otherMappedAttrNodes[ i ].isLeaf = false;
    }

    // Initialize the parent object
    parentVMO.expanded = true;
    parentVMO.isExpanded = true;
    parentVMO.isLeaf = false;
    if( !parentVMO.children ) {
        parentVMO.children = [];
    }

    // Get the parent's index in the table
    var parentIdx = _.findLastIndex( _vmc.loadedVMObjects, function( vmo ) {
        return vmo.uid === parentVMO.uid;
    } );

    // Add the new attr proxies
    for( i = 0; i < proxyObjects.length; ++i ) {
        var childIdx = _findIndexOfProxyByUid( parentVMO.children, proxyObjects[ i ] );
        // only add if it's not already there
        if( childIdx < 0 ) {
            _insertNewMappedAttribute( parentVMO, parentIdx, proxyObjects[ i ] );
        }
    }
}

/**
 * @param {JSO} response - SOA response object
 * @param {PolicyId} policyId - Registered property policy
 * @param {Array} parentVMOs the parent VMOs
 */
function _handleGetMappedAttrAlignmentsResponse( response, policyId, parentVMOs ) {
    if( response.searchResultsJSON ) {
        var parentUidToParentVMOMap = {};
        var parentUidToChildrenVMOsMap = {};
        var parentVMO = null;
        for( var i = 0; i < parentVMOs.length; ++i ) {
            parentVMO = parentVMOs[ i ];
            parentVMO.addAllProxies = !parentVMO.isLeaf && ( parentVMO.expanded !== undefined && !parentVMO.expanded ||
                parentVMO.isExpanded !== undefined && !parentVMO.isExpanded || !parentVMO.children || parentVMO.children.length === 0 );

            parentUidToParentVMOMap[ parentVMO.uid ] = parentVMO;
            parentUidToChildrenVMOsMap[ parentVMO.uid ] = [];
        }

        var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
        if( searchResults && _isArrayPopulated( searchResults.objects ) ) {
            for( var ndx = 0; ndx < searchResults.objects.length; ++ndx ) {
                var uid = searchResults.objects[ ndx ].uid;
                var obj = response.ServiceData.modelObjects[ uid ];
                if( obj && obj.props.att1Parent ) {
                    var parentUid = obj.props.att1Parent.dbValues[ 0 ];
                    parentVMO = parentUidToParentVMOMap[ parentUid ];
                    // Only add the proxy to the table if the parent node is not expanded...
                    //  (we want to add all of the parent's children to the table in this case)
                    if( parentVMO.addAllProxies ) {
                        parentUidToChildrenVMOsMap[ parentUid ].push( obj );
                    } else {
                        // ...or if the proxy is not already present in the table
                        var index = _findIndexOfProxyByUid( _vmc.loadedVMObjects, obj );
                        if( index < 0 ) {
                            parentUidToChildrenVMOsMap[ parentUid ].push( obj );
                        }
                    }
                }
            }
        }

        // add the proxies to the table
        for( i = 0; i < parentVMOs.length; ++i ) {
            parentVMO = parentVMOs[ i ];
            var childProxies = parentUidToChildrenVMOsMap[ parentVMO.uid ];
            if( childProxies.length > 0 ) {
                _addMappedAttrProxyObjectsToTable( parentVMO, childProxies );
            }
        }
    }

    // unregister the policy property
    if( policyId ) {
        policySvc.unregister( policyId );
    }
}

/**
 * After a mapMeasurableAttributes SOA call, we want to add new rows to the attribute mapping table
 * where needed for the new mapped attributes.
 */
export let addMappedAttrsToTable = function() {
    var selectedAttrProxies = appCtxSvc.getCtx( 'selectedProxyObjects' );
    if( selectedAttrProxies && selectedAttrProxies.length === 1 && _vmc ) {
        // the selectedAttrProxy should be the parent or source attribute for the mapping operation
        var parentVMO = selectedAttrProxies[ 0 ];
        if( parentVMO ) {
            var parentVMOs = [];
            parentVMOs.push( parentVMO );
            var parentUids = parentVMO.uid;

            // If the parent has other occurrences in the table, and those nodes are expanded, we need to
            //  update the children of those nodes as well.
            for( var i = 0; i < _vmc.loadedVMObjects.length; ++i ) {
                // get the VMOs for proxy objects that have the same source as the parent
                var vmo = _vmc.loadedVMObjects[ i ];
                if( ( vmo.expanded || vmo.isExpanded ) && vmo.props && vmo.uid !== parentVMO.uid &&
                    vmo.props.att1SourceAttribute.dbValues[ 0 ] === parentVMO.props.att1SourceAttribute.dbValues[ 0 ] &&
                    vmo.props.att1SourceElement.dbValues[ 0 ] === parentVMO.props.att1SourceElement.dbValues[ 0 ] ) {
                    parentVMOs.push( vmo );
                    parentUids += ' ' + vmo.uid;
                }
            }

            var mapContext = appCtxSvc.getCtx( _mappingTableContextName );
            var soaInput = attrTableCreateSvc.getPerformSearchViewModelInput( 'AWClient', mapContext.clientScopeURI, mapContext.openedObjectUid, 'false',
                parentUids, '', mapContext.productContextUids, mapContext.rootElementUids, 0, undefined );

            // ensure the required attributes are returned
            var policyId = policySvc.register( {
                types: [ {
                    name: 'Att1AttributeAlignmentProxy',
                    properties: [ {
                        name: 'att1AttributeAlignment'
                    }, {
                        name: 'att1ContextObject'
                    }, {
                        name: 'att1HasChildren'
                    }, {
                        name: 'att1Parent'
                    }, {
                        name: 'att1SourceAttribute'
                    }, {
                        name: 'att1SourceElement'
                    } ]
                } ]
            } );

            soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput ).then(
                function( response ) {
                    _handleGetMappedAttrAlignmentsResponse( response, policyId, parentVMOs );
                } );
        }
    }
};

var loadConfiguration = function() {
    eventBus.subscribe( 'vmc.new.gridDataProvider', function( event ) {
        if( event.vmc ) {
            _vmc = event.vmc;
        }
    } );
};

loadConfiguration();

/**
 * Att1AttrMappingTableMapService factory
 */

export default exports = {
    getAutomapInputs,
    getAutomapPrefs,
    evaluateAutomapResults,
    mapAttributes,
    onSublocationSelectionChange,
    setPinMapAttrPanel,
    setUnPinMapAttrPanel,
    addMappedAttrsToTable
};
app.factory( 'Att1AttrMappingTableMapService', () => exports );
