/* eslint-disable class-methods-use-this */
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
 * This is the command handler for save edit in attribute system modeler
 *
 * @module js/saveEditAttrCommandHandler
 */
import * as app from 'app';
import editHandlerSvc from 'js/editHandlerService';
import cmm from 'soa/kernel/clientMetaModel';
import appCtxSvc from 'js/appCtxService';
import dms from 'soa/dataManagementService';
import cdm from 'soa/kernel/clientDataModel';
import dataManagementSvc from 'soa/dataManagementService';
import AwPromiseService from 'js/awPromiseService';
import dateTimeSvc from 'js/dateTimeService';
import uwPropertyService from 'js/uwPropertyService';
import AwRootScopeService from 'js/awRootScopeService';
import viewModelService from 'js/viewModelService';
import editHandlerService from 'js/editHandlerService';
import navigationUtils from 'js/navigationUtils';
import _ from 'lodash';
import 'js/eventBus';
import 'js/commandsMapService';
import AwBaseService from 'js/awBaseService';

export default class SaveEditAttrCommandHandler extends AwBaseService {
    constructor() {
        super();
        /**
         * Cached CommandsMapService
         */

        this._attrProperties = [ 'att1Result' ];

        this._globalSetupPromise = this.startGlobalEventListener();
    }

    /**
     * This is an ugly hack to cover up some bug somewhere - not clear if it is SOA bug or something else
     *
     * The very first time an attribute is edited the "intermediateUid" of the properties seems to change.
     *
     * The first intermediate UID is an Attribute with Source Type "System Block Revision" and Context Object Type
     * "System Block Revision"
     *
     * The second intermediate UID is an Attribute with Source Type "System Block" and Context Object Type "System Block
     * Revision"
     *
     * It's not clear what the problem is but it is covered up by a global event listener. The global event listener was
     * previously in attribute management commandsViewModel.json, but had to be moved here as commandsViewModel can no
     * longer contain global anything.
     *
     * This global listener should not exist and finding the correct workaround has been tracked as a defect.
     */
    startGlobalEventListener( ) {
        var hackScope = AwRootScopeService.instance.$new();
        var hackViewModel = {
            _viewModelId: 'attrMgmtGlobalEventListener',
            actions: {
                isAttrItemUpdated: {
                    actionType: 'JSFunction',
                    method: 'isAttrItemUpdated',
                    inputData: {
                        eventMap: '{{data.eventMap}}'
                    },
                    outputData: {
                        isCdmefresh: ''
                    },
                    events: {
                        success: [ {
                            name: 'cdm.relatedModified',
                            condition: 'data.isCdmefresh == true',
                            eventData: {
                                refreshLocationFlag: true,
                                relations: '',
                                relatedModified: [ '{{ctx.attrParentObject}}' ]
                            }
                        } ]
                    },
                    deps: 'js/saveEditAttrCommandHandler'
                }
            },
            onEvent: [ {
                eventId: 'cdm.updated',
                cacheEventData: true,
                action: 'isAttrItemUpdated'
            } ]
        };

        return viewModelService.populateViewModelPropertiesFromJson( hackViewModel ).then( ( viewModel ) => {
            viewModelService.setupLifeCycle( hackScope, viewModel );
        } );
    }

    /**
     * Wrapper for EHS save edits.
     *
     * Have to ensure this service is loaded before calling SOA
     */
    saveEdits() {
        return this._globalSetupPromise.then( editHandlerService.saveEdits );
    }

    /**
     * get the modified list of the attributes
     *
     * @param {data} context - data of the view model
     */
    getModifiedList( data ) {
        var otherInputs = [];
        var promises = [];
        var attrinputs = [];

        var editHandler = editHandlerService.getActiveEditHandler();
        if( editHandler ) {
            var dataSource = editHandler.getDataSource();
            var allModifiedObjects = dataSource.getAllModifiedPropertiesWithVMO();
            // create the array of the object
            _.forEach( allModifiedObjects, ( modiProp ) => {
                var vmObject = _.get( modiProp, 'viewModelObject' );
                if( vmObject.type === 'Awp0XRTObjectSetRow' ) {
                    var targetObj = _.get( vmObject, 'props.awp0Target' );
                    if( targetObj.dbValue ) {
                        vmObject = cdm.getObject( targetObj.dbValue );
                    } else {
                        vmObject = uwPropertyService.getSourceModelObject( targetObj );
                    }
                }
                var IsAttrInputs = cmm.isInstanceOf( 'Att0MeasurableAttribute', vmObject.modelType );
                if( IsAttrInputs ) {
                    var promise = this.createModiProp( modiProp, data, vmObject );
                    promises.push( promise );
                } else {
                    otherInputs.push( modiProp );
                }
            } );

            data.modifiedAttrIn = attrinputs;
            if( otherInputs.length > 0 ) {
                this.prepareSOAInForOther( otherInputs );
            }

            return AwPromiseService.instance.all( promises ).then( ( results ) => {
                _.forEach( results, ( result ) => {
                    if( result !== null ) {
                        attrinputs.push( result );
                    }
                } );
                data.modifiedAttrIn = attrinputs;

                return allModifiedObjects;
            } );
        }
        return AwPromiseService.instance.resolve();
    }

    /**
     * Create the overridable input array
     *
     *
     * @param {data} context - data of the view model
     * @param {modProps} context - modified properties from XRT
     */

    createModiProp( modProps, data, vmObject ) {
        var deferred = AwPromiseService.instance.defer();
        var columnPropNames = [];
        var uids = [];
        var isOutput = false;
        columnPropNames.push( 'att0Overridable' );
        columnPropNames.push( 'att1InOut' );
        uids.push( vmObject.uid );

        var promise = dataManagementSvc.getProperties( uids, columnPropNames );
        promise.then( () => {
            // check if the attribute is overridable false
            if( vmObject.props.att0Overridable ) {
                var isOverrideAble = vmObject.props.att0Overridable.dbValues[ 0 ] !== '0';
            }
            if( vmObject.props.att1InOut ) {
                isOutput = vmObject.props.att1InOut.dbValues[ 0 ] === 'out';
            }
            // check for the overridable set
            if( isOverrideAble ) {
                var vmProps = _.get( modProps, 'viewModelProps' );
                var attrentries = {};
                var mattrentries = {};
                _.forEach( vmProps, ( prop ) => {
                    var propName = prop.propertyName;
                    var propValue = prop.dbValue.toString();
                    var measAttrObjects = [];
                    var selObjects = [];

                    // check for the measurable attribute sets
                    if( this.isMeasuredValueProperty( propName ) ) {
                        var mpropName = propName.replace( 'att1', 'att0' );
                        if( prop.type === 'DATE' ) {
                            propValue = dateTimeSvc.formatUTC( prop.dbValues[ 0 ] );
                        }
                        measAttrObjects[ mpropName ] = [ propValue ];
                        mattrentries = _.assign( mattrentries, measAttrObjects );
                    } else {
                        // check if the attribute property is output
                        if( !isOutput || this.isOutputAttrPropertyModifiable( propName ) ) {
                            selObjects[ propName ] = [ propValue ];
                            attrentries = _.assign( attrentries, selObjects );
                        } else {
                            data.isOutput = true;
                        }
                    }
                } );
                var soaInput = this.prepareSOAInForAttr( attrentries, mattrentries, vmObject );
                deferred.resolve( soaInput );
            } else {
                data.IsOveridableAttr = true;
                deferred.resolve( null );
            }
        } );
        return deferred.promise;
    }

    /**
     * If the overridable flag is there , refresh the page for the sys block
     *
     * @param {res} response - response from the createUpdateSOA
     * @param {isRefresh} return - true if page wants to get refresh
     */

    checkOccData( res ) {
        var isRefresh = false;
        if( res ) {
            _.forEach( res, ( entry ) => {
                if( entry.type === 'AbsOccData' ) {
                    isRefresh = true;
                }
            } );
        }
        return isRefresh;
    }

    updateContext( res ) {
        if( res ) {
            var isAbsOccDataUpdated = false;
            var isAttrUpdated = false;

            for( var idx = 0; idx < res.length; ++idx ) {
                if( cmm.isInstanceOf( 'AbsOccData', res[ idx ].modelType ) ) {
                    isAbsOccDataUpdated = true;
                } else if( cmm.isInstanceOf( 'Att0MeasurableAttribute', res[ idx ].modelType ) ) {
                    isAttrUpdated = true;
                }
            }

            if( isAbsOccDataUpdated && isAttrUpdated ) {
                if( cmm.isInstanceOf( 'Att0MeasurableAttribute', appCtxSvc.ctx.selected.modelType ) ) {
                    appCtxSvc.registerCtx( 'attrParentObject', appCtxSvc.ctx.pselected );
                } else {
                    appCtxSvc.registerCtx( 'attrParentObject', appCtxSvc.ctx.selected );
                }
                return true;
            }
        }
    }

    /**
     * If the overridable flag is there , refresh the page for the sys block in dcp true
     *
     * @param {response} response - response from the createUpdateSOA
     * @param {isRefresh} return - true if page wants to get refresh
     */

    isAttrItemUpdated( response ) {
        if( appCtxSvc.ctx && appCtxSvc.ctx.xrtPageContext ) {
            var xrtPageContext = appCtxSvc.ctx.xrtPageContext;

            if( xrtPageContext.secondaryXrtPageID === 'tc_xrt_Attributes' ||
                xrtPageContext.primaryXrtPageID === 'tc_xrt_Attributes' ||
                xrtPageContext.secondaryXrtPageID === 'tc_xrt_AttributesForDCP' ||
                xrtPageContext.primaryXrtPageID === 'tc_xrt_AttributesForDCP' ) {
                var vmProperties = _.get( response, 'cdm.updated' );
                var res = _.get( vmProperties, 'updatedObjects' );

                var isAttrUpdate = this.updateContext( res );
                if( isAttrUpdate ) {
                    return isAttrUpdate;
                }
            }
        }

        return false;
    }

    /**
     * Check if the given property is owned by the measured value
     *
     * @param {propName} propName - the given property name
     */
    isMeasuredValueProperty( propName ) {
        for( var idx = 0; idx < this._attrProperties.length; ++idx ) {
            if( propName === this._attrProperties[ idx ] ) {
                return false;
            }
        }

        if( _.startsWith( propName, 'att1' ) ) {
            return true;
        }

        return false;
    }

    /**
     * Check if the given property on the output attribute is modifiable
     *
     * @param {propName} propName - the given property name
     */
    isOutputAttrPropertyModifiable( propName ) {
        for( var idx = 0; idx < this._attrProperties.length; ++idx ) {
            if( propName === this._attrProperties[ idx ] ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get the type of the measurable input type
     *
     * @param {selectedType} type - type of the input of the measurable
     * @param {modProps} return - type from the modified properties
     */

    getType( selectedType ) {
        var type = '';
        switch ( selectedType ) {
            case 'Att0MeasurableAttributeInt':
                type = 'Att0MeasureValueInt';
                break;
            case 'Att0MeasurableAttributeStr':
                type = 'Att0MeasureValueStr';
                break;
            case 'Att0MeasurableAttributeBool':
                type = 'Att0MeasureValueBool';
                break;
            case 'Att0MeasurableAttributeDbl':
                type = 'Att0MeasureValueDbl';
                break;
            default:
                type = null;
        }
        return type;
    }

    /**
     * Create the SOA input for the overridiable properties
     *
     * @param {data} context - data of the view model
     * @param {modProps} context - modified properties from XRT
     */

    prepareSOAInForAttr( input, mearInputs, vmo ) {
        var selected;
        if( appCtxSvc.ctx.selected ) {
            selected = appCtxSvc.ctx.selected;
        } else {
            selected = appCtxSvc.ctx.pselected;
        }

        var measureAbleType = this.getType( vmo.type );
        var IsContextLine = cmm.isInstanceOf( 'Awb0Element', selected.modelType );
        if( IsContextLine ) {
            var contextLine = {
                uid: appCtxSvc.ctx.pselected.uid,
                type: appCtxSvc.ctx.pselected.type
            };
        }
        var attribute = {
            type: vmo.type,
            uid: vmo.uid
        };
        if( appCtxSvc.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Content' &&
            appCtxSvc.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Attributes' ) {
            var parentLine = {
                uid: selected.uid,
                type: selected.type
            };
        } else {
            var parentObj = {
                uid: selected.uid,
                type: selected.type
            };
        }
        var objInput = {
            objPropertiesMap: input,
            objType: ''
        };
        var mobjInput = {
            objPropertiesMap: mearInputs,
            objType: measureAbleType
        };
        var attributeObjInput = {
            objInput: objInput,
            objName: ''
        };
        var inputs = {
            clientId: vmo.uid,
            attribute: attribute,
            attributeObjInput: attributeObjInput,
            measureValueObjInput: mobjInput,
            parentLine: parentLine,
            contextLine: contextLine,
            parentObj: parentObj,
            relationName: ''
        };
        return inputs;
    }

    /**
     * call the default SOA for the other modifiable inputs
     *
     * @param {modifiedPropsWithoutSubProp} modifiedPropsWithoutSubProp - modified properties from XRT
     */

    prepareSOAInForOther( modifiedPropsWithoutSubProp ) {
        var inputs = [];
        _.forEach( modifiedPropsWithoutSubProp, ( modifiedObj ) => {
            var viewModelObject = modifiedObj.viewModelObject;
            var viewModelProps = modifiedObj.viewModelProps;
            var input = dms.getSaveViewModelEditAndSubmitToWorkflowInput( viewModelObject );
            _.forEach( viewModelProps, ( props ) => {
                dms.pushViewModelProperty( input, props );
            } );
            inputs.push( input );
        } );
        dms.saveViewModelEditAndSubmitWorkflow( inputs );
    }
}

/**
 *
 * @memberof NgServices
 * @member saveEditAttrCommandHandler
 */
app.factory( 'saveEditAttrCommandHandler', () => SaveEditAttrCommandHandler.instance );
