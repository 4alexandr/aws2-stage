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
 * @module js/createAnalysisRequest
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import uwPropSvc from 'js/uwPropertyService';
import cdm from 'soa/kernel/clientDataModel';
import cmdMapSvc from 'js/commandsMapService';
import createAnalysisRequestFromDigramUtils from 'js/createAnalysisRequestFromDigramUtils';
import _ from 'lodash';

var exports = {};

var m_isNativeArchTabSelected = null;
var _parentChildMap = {};
var _selectedObjects = [];

var _getCreateInputObject = function( boName, propertyNameValues, compoundCreateInput ) {
    var createInputObject = {
        boName: boName,
        propertyNameValues: propertyNameValues,
        compoundCreateInput: compoundCreateInput
    };
    return createInputObject;
};

var _addChildInputToParentMap = function( fullPropertyName, count, propertyNameTokens, createInputMap, vmProp ) {
    var propName = propertyNameTokens[ count ];
    var childFullPropertyName = fullPropertyName;
    if( count > 0 ) {
        childFullPropertyName += '__' + propName; //$NON-NLS-1$
    } else {
        childFullPropertyName += propName;
    }

    // Check if the child create input is already created
    var childCreateInput = _.get( createInputMap, childFullPropertyName );
    if( !childCreateInput && vmProp && vmProp.intermediateCompoundObjects ) {
        var compoundObject = _.get( vmProp.intermediateCompoundObjects, childFullPropertyName );
        if( compoundObject ) {
            // Get the parent create input
            var parentCreateInput = _.get( createInputMap, fullPropertyName );
            if( parentCreateInput ) {
                // Create the child create input
                // Add the child create input to parent create input
                childCreateInput = _getCreateInputObject( compoundObject.modelType.owningType, {}, {} );
                if( !parentCreateInput.compoundCreateInput.hasOwnProperty( propName ) ) {
                    parentCreateInput.compoundCreateInput[ propName ] = [];
                }
                parentCreateInput.compoundCreateInput[ propName ].push( childCreateInput );

                createInputMap[ childFullPropertyName ] = childCreateInput;
            }
        }
    }
    return childFullPropertyName;
};

var _processPropertyForCreateInput = function( propName, vmProp, createInputMap ) {
    if( vmProp ) {
        var valueStrings = uwPropSvc.getValueStrings( vmProp );
        if( valueStrings && valueStrings.length > 0 ) {
            var propertyNameTokens = propName.split( '__' );
            var fullPropertyName = '';
            for( var i = 0; i < propertyNameTokens.length; i++ ) {
                if( i < propertyNameTokens.length - 1 ) {
                    // Handle child create inputs
                    fullPropertyName = _addChildInputToParentMap( fullPropertyName, i, propertyNameTokens,
                        createInputMap, vmProp );
                } else {
                    // Handle property
                    var createInput = createInputMap[ fullPropertyName ];
                    if( createInput ) {
                        var propertyNameValues = createInput.propertyNameValues;
                        _.set( propertyNameValues, propertyNameTokens[ i ], valueStrings );
                    }
                }
            }
        }
    }
};

//Update Primary work area selections
function setSelectedElements( _selectedElementsInPWA ) {
    var openedObjectUid = createAnalysisRequestFromDigramUtils.getOpenedObjectUid();
    var multipleSelectObj = appCtxSvc.getCtx( 'mselected' );

    //If Recipe object is opened and nothing is selected from Result table
    //Then send seed objects as input to manageAnalysis SOA
    if( multipleSelectObj.length === 1 && multipleSelectObj[ 0 ].type === 'Fnd0SearchRecipe' ) {
        for( var i = 0; i < appCtxSvc.ctx.recipeCtx.seedSelections.length; ++i ) {
            if( appCtxSvc.ctx.recipeCtx.seedSelections[ i ].modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) {
                _selectedElementsInPWA.push( appCtxSvc.ctx.recipeCtx.seedSelections[ i ] );
                appCtxSvc.registerCtx('isElementSelectedFromRecipe',true);
            }
        }
    }
    //If Recipe object is opened and some objets are selected from Result table
    //Then send "Result" table seleced objects as input to manageAnalysis SOA
    else if( appCtxSvc.ctx.pselected && appCtxSvc.ctx.pselected.type === 'Fnd0SearchRecipe' ) {
        for( var j = 0; j < appCtxSvc.ctx.mselected.length; j++ ) {
            if( appCtxSvc.ctx.mselected[ j ].type === 'Evm1RecipeResultProxy' ) {
                var targetObj = cdm.getObject( appCtxSvc.ctx.mselected[ j ].props.evm1SourceObject.dbValues[0] );
                if( targetObj.modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) {
                    _selectedElementsInPWA.push( targetObj );
                    appCtxSvc.registerCtx('isElementSelectedFromRecipe',true);
                }
            }
        }
    } else {
        var xrtPageID = appCtxSvc.getCtx( 'xrtPageContext' );
        var arcTabId = xrtPageID.secondaryXrtPageID;

        if(!arcTabId)
        {
            var state = appCtxSvc.getCtx( 'state' );
            arcTabId = state.params.spageId;
        }
        m_isNativeArchTabSelected = arcTabId === 'Ase0ArchitectureFeature';

        for( var i = 0; i < multipleSelectObj.length; ++i ) {
            var selectedObj = cdm.getObject( multipleSelectObj[ i ].uid );
            if( cmdMapSvc.isInstanceOf( 'Awb0Element', selectedObj.modelType ) &&
                multipleSelectObj[ i ].uid !== openedObjectUid ) {
                _selectedElementsInPWA.push( selectedObj );
            }
        }
    }
    _selectedObjects = _selectedElementsInPWA;
}

//Update Diagram Selections
function updateDiagramSelection( _selectedElementsInPWA ) {
    if( m_isNativeArchTabSelected ) {
        var graphContext = appCtxSvc.getCtx( 'graph' );
        if(graphContext !== undefined){


        var graphModel = graphContext.graphModel;
        var groupGraph = graphModel.graphControl.groupGraph;
        var selectedNodesOfDiagram = graphModel.graphControl.getSelected( 'Node' );

        //addAllVisibleElements
        createAnalysisRequestFromDigramUtils.addAllVisibleElements( selectedNodesOfDiagram, groupGraph,
            _parentChildMap, _selectedObjects );

        //addAllVisibleConnection
        var visibleEdgeModel = [];
        var visibleConnections = [];
        createAnalysisRequestFromDigramUtils.addAllVisibleConnection( graphModel, visibleEdgeModel,
            visibleConnections, _selectedObjects );

        //addAllVisibleEndElementsOfTracelink
        var selectedEdgesOfDiagram = graphModel.graphControl.getSelected( 'Edge' );
        var selectedTraceLink = [];
        _.forEach( selectedEdgesOfDiagram, function( tracelink ) {
            if( cmdMapSvc.isInstanceOf( 'FND_TraceLink', tracelink.modelObject.modelType ) ) {
                selectedTraceLink.push( tracelink );
            }
        } );
        createAnalysisRequestFromDigramUtils.addAllVisibleEndElementsOfTracelink( selectedTraceLink,
            groupGraph, _selectedElementsInPWA, _parentChildMap, _selectedObjects );

        //addAllVisibleEndElementsOfConnection
        var selectedConnections = [];
        _.forEach( visibleConnections, function( connection ) {
            if( cmdMapSvc.isInstanceOf( 'Awb0Connection', connection.modelObject.modelType ) ) {
                selectedConnections.push( connection );
                _selectedObjects.push( connection.modelObject );
            }
        } );

        if( selectedConnections.length > 0 ) {
            var elements = [];
            createAnalysisRequestFromDigramUtils.addAllVisibleEndElementsOfConnection( selectedConnections,
                groupGraph, elements, _parentChildMap, _selectedObjects );

            createAnalysisRequestFromDigramUtils.getConnectionOfVisibleElements( _selectedObjects, elements,
                graphModel );
        }
        }
    }
}

function populateARContext() {
    var _selectedElementsInPWA = [];
    setSelectedElements( _selectedElementsInPWA );
    updateDiagramSelection( _selectedElementsInPWA );

    createAnalysisRequestFromDigramUtils.setSOAInput( _selectedObjects, _parentChildMap,
        m_isNativeArchTabSelected );
}

/**
 * Get input data for object creation.
 *
 * @param {Object} data the view model data object
 */
export let initCreateObject = function( data ) {
    var createInputMap = {};
    createInputMap[ '' ] = _getCreateInputObject( data.objCreateInfo.createType, {}, {} );

    _.forEach( data.objCreateInfo.propNamesForCreate, function( propName ) {
        var vmProp = _.get( data, propName );
        if( vmProp && ( vmProp.isAutoAssignable || uwPropSvc.isModified( vmProp ) ) ) {
            _processPropertyForCreateInput( propName, vmProp, createInputMap );
        }
    } );

    _.forEach( data.customPanelInfo, function( customPanelVMData ) {
        var oriVMData = customPanelVMData._internal.origDeclViewModelJson.data;
        _.forEach( oriVMData, function( propVal, propName ) {
            if( _.has( customPanelVMData, propName ) ) {
                var vmProp = customPanelVMData[ propName ];
                _processPropertyForCreateInput( propName, vmProp, createInputMap );
            }
        } );
    } );

    // 'data.workflowData' and 'data.dataToBeRelated' need be set properly at application's Add panel if they are required for create input.
    var dataToBeRelated = data.dataToBeRelated;
    if( !dataToBeRelated ) {
        dataToBeRelated = {};
    }

    var workflowData = data.workflowData;
    if( !workflowData ) {
        workflowData = {};
    }

    data.createInputs = [ {
        clientId: 'CreateAnalysisRequest',
        createData: _.get( createInputMap, '' ),
        dataToBeRelated: dataToBeRelated,
        workflowData: workflowData,
        targetObject: null,
        pasteProp: ''
    } ];

    // set domain
    if( appCtxSvc.ctx.selected.type === 'Att0ParamProject' ) {
        data.createInputs[ 0 ].createData.compoundCreateInput.revision[ 0 ].propertyNameValues.crt0Domain = [ appCtxSvc.ctx.selected.uid ];
    } else if( appCtxSvc.ctx.parammgmtctx && appCtxSvc.ctx.parammgmtctx.paramProject ) {
        data.createInputs[ 0 ].createData.compoundCreateInput.revision[ 0 ].propertyNameValues.crt0Domain = [ appCtxSvc.ctx.parammgmtctx.paramProject.uid ];
    } else if( appCtxSvc.ctx.pselected && appCtxSvc.ctx.pselected.type === 'Att0ParamProject')  {
        data.createInputs[ 0 ].createData.compoundCreateInput.revision[ 0 ].propertyNameValues.crt0Domain = [ appCtxSvc.ctx.pselected.uid ];
    } else if( appCtxSvc.ctx.selected.type === 'Fnd0SearchRecipe' || appCtxSvc.ctx.xrtSummaryContextObject && appCtxSvc.ctx.xrtSummaryContextObject.type === 'Fnd0SearchRecipe' ) {
        data.createInputs[ 0 ].createData.compoundCreateInput.revision[ 0 ].propertyNameValues.crt0Domain = [ appCtxSvc.ctx.xrtSummaryContextObject.uid ];
    } else if ( data.domainUid !== undefined ) {
        data.createInputs[ 0 ].createData.compoundCreateInput.revision[ 0 ].propertyNameValues.crt0Domain = [ data.domainUid ];
    }
    //Populate AR Context to add PWA/Diagram elements or connections into Analysis Request object.
    populateARContext();
};

export let getManageARInputForCreateVR = function( createdAR, _manageAction, elementsToAdd, recipeId, seeds) {
    var elementInputs = [];
    for( var i = 0; i < elementsToAdd.length; i++ ) {
        var elementInput = {};
        elementInput.elementAction = '';
        elementInput.objectToAdd = {
            type : elementsToAdd[ i ].type,
            uid : elementsToAdd[ i ].uid
        };
        elementInput.objectToAddContext = '';
        elementInput.objectToAddParent = '';
        elementInput.addParameterAsInOut = '';
        elementInput.addUnderlyingObject = false;
        elementInput.parameterInfo = [{
            parameter: '',
            direction: ''
            }];
        elementInput.portToInterfaceDefsMap = [
            [],
            []
        ];
        elementInputs.push( elementInput );
        var succMsg = '';
        if ( elementsToAdd[ i ].props && elementsToAdd[ i ].props.object_string ) {
            if( elementsToAdd.length === 1 ) {
                succMsg += elementsToAdd[ i ].props.object_string.dbValues[ 0 ];
            } else {
                succMsg += elementsToAdd[ i ].props.object_string.dbValues[ 0 ] + ',';
            }
        }
    }
    var pref = {
        diagramAction: '',
        useClosureRule: false
    };
    var input = [ {
        clientId: 'AW_AR_Client',
        verificationRequest: {
            type: createdAR.type,
            uid: createdAR.uid
        },
        data: [ {
            manageAction: _manageAction,
            elementInputs: elementInputs,
            recipeData: {
                recipe: recipeId,
                seedObjects: seeds,
                context: ''
            }
        } ]
    } ];
    var manageARInputForCreateVR = {};
    manageARInputForCreateVR.input = input;
    manageARInputForCreateVR.pref = pref;
    manageARInputForCreateVR.succMsg = succMsg;
    manageARInputForCreateVR.oobj = createdAR;
    return manageARInputForCreateVR;
};
/*
 * Gets the content for open cell command
 */
export let getContentObject = function( obj ) {
    if( obj !== undefined && obj.props.crt1SourceObject ) {
        // return the content ID
        var contentUid = obj.props.crt1SourceObject.dbValues[ 0 ];
        return cdm.getObject( contentUid );
    }
    if(obj === undefined){
        if( appCtxSvc.ctx.selected && appCtxSvc.ctx.selected.props.awb0UnderlyingObject){
            return appCtxSvc.ctx.selected.props.awb0UnderlyingObject.dbValues[0];
        }else{
            return appCtxSvc.ctx.selected.uid;
        }
    }
};

/**
 * Returns the createAnalysisRequest instance
 *
 * @member createAnalysisRequest
 */

export default exports = {
    initCreateObject,
    getManageARInputForCreateVR,
    getContentObject
};
app.factory( 'createAnalysisRequest', () => exports );
