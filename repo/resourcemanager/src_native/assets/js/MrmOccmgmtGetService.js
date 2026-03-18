// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/MrmOccmgmtGetService
 */
import app from 'app';
import AwFilterService from 'js/awFilterService';
import soaSvc from 'soa/kernel/soaService';
import clientDataModelSvc from 'soa/kernel/clientDataModel';
import appCtxService from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import mrmOccmgmtGetOccsResponseService from 'js/MrmOccmgmtGetOccsResponseService';
import occmgmtRequestPrefPopulatorService from 'js/occmgmtRequestPrefPopulatorService';
import _ from 'lodash';
import localStorage from 'js/localStorage';

import 'js/aceFilterService';

var _NULL_ID = 'AAAAAAAAAAAAAA';

var IModelObject = function( uid, type ) {
    this.uid = uid;
    this.type = type;
};

var _getObject = function( uid ) {
    if( clientDataModelSvc.isValidObjectUid( uid ) ) {
        var obj = clientDataModelSvc.getObject( uid );

        if( !obj ) {
            return new IModelObject( uid, 'unknownType' );
        }

        return obj;
    }

    return new IModelObject( clientDataModelSvc.NULL_UID, 'unknownType' );
};

var _convertDate = function( dateInEpochFormat ) {
    if( !dateInEpochFormat ) {
        dateInEpochFormat = new Date( '0001-01-01T00:00:00' ).getTime();
    }
    return AwFilterService.instance( 'date' )( dateInEpochFormat, 'yyyy-MM-dd' ) + 'T' +
        AwFilterService.instance( 'date' )( dateInEpochFormat, 'HH:mm:ssZ' );
};

var _populateFocusOccurrenceInputParameters = function( inputData, currentContext ) {
    /**
     * Check if the 'focus' has not been set yet.
     */
    if( _.isEmpty( inputData.resourceFocusOccurrenceInput ) ) {
        if( currentContext.currentState.c_csid ) {
            inputData.resourceFocusOccurrenceInput.cloneStableIdChain = currentContext.currentState.c_csid;
        } else {
            if( //
                clientDataModelSvc.isValidObjectUid( currentContext.currentState.c_uid ) && //
                clientDataModelSvc.isValidObjectUid( currentContext.currentState.o_uid ) && //
                clientDataModelSvc.isValidObjectUid( inputData.parentElement ) && //
                currentContext.currentState.c_uid !== currentContext.currentState.o_uid && //
                currentContext.currentState.c_uid !== currentContext.currentState.t_uid ) {
                /**
                 * Note: We only want to set a 'focus' when we have all the correct 'parent' information.
                 */
                inputData.resourceFocusOccurrenceInput.element = _getObject( currentContext.currentState.c_uid );
            }
        }
    }
};

var _populateCursorParameters = function( cursor, loadInput ) {
    if( loadInput.cursorObject ) {
        _.assign( cursor, loadInput.cursorObject );
    } else if( loadInput.parentNode && loadInput.parentNode.cursorObject ) {
        _.assign( cursor, loadInput.parentNode.cursorObject );
    } else {
        /**
         * Going forward, we need need to use cursor information here if it is a scroll case.
         * <P>
         * If we use cursor, it will bring next set of children.
         * <P>
         * For normal expand (expand collapse expand use case), where user expects to see first page again, doing
         * scroll there doesn't make sense. We need information from CFX where it is scroll case or expand case
         */
        cursor.startReached = false;
        cursor.endReached = false;
        cursor.startIndex = loadInput.startChildNdx;
        cursor.endIndex = 0;
        cursor.pageSize = loadInput.pageSize;
        // We can not pass clientDataModelSvc.NULL_UID in startOccUid and endOccUid for following reason
        // 1. These are not uid they are pfuid from RTT_BOMLINE. specialized RM DFS mechanism for doing pagination.
        // 2. platform Requirement Management does not check for NULL_UID. They check for empty string ("")
        // 3. RM is implementing null uid check in server occmgmt layer to translate NULL_UID to "". Till they are done we need to continue passing empty string
        // 4. As of now passing NULL_UID causes server hang in flat navigation use-cases for 11.3 and above.
        cursor.startOccUid = '';
        cursor.endOccUid = '';
    }
};

// eslint-disable-next-line complexity
var _populateConfigurationParameters = function( config, currentContext ) {
    if( !config.hasOwnProperty( 'productContext' ) ) {
        config.productContext = _getObject( currentContext.currentState.pci_uid );
    }

    var pci;

    if( currentContext.configContext ) {
        var configContext = currentContext.configContext;

        if( !_.isEmpty( configContext ) ) {
            config.endItem = _getObject( configContext.ei_uid );
            config.revisionRule = _getObject( configContext.r_uid );
            config.svrOwningProduct = _getObject( configContext.iro_uid );

            if( clientDataModelSvc.isValidObjectUid( configContext.var_uid ) ) {
                config.variantRules = [ _getObject( configContext.var_uid ) ];
            }

            if( configContext.var_uids ) {
                config.variantRules = [];
                for( var i = 0; i < configContext.var_uids.length; i++ ) {
                    if( clientDataModelSvc.isValidObjectUid( configContext.var_uids[ i ] ) ) {
                        config.variantRules[ i ] = _getObject( configContext.var_uids[ i ] );
                    }
                }
            }

            // Add effectivityGroups
            if( configContext.eg_uids ) {
                config.effectivityGroups = [];
                for( var i = 0; i < configContext.eg_uids.length; i++ ) {
                    if( clientDataModelSvc.isValidObjectUid( configContext.eg_uids[ i ] ) ) {
                        config.effectivityGroups[ i ] = _getObject( configContext.eg_uids[ i ] );
                    }
                }
            }

            if( clientDataModelSvc.isValidObjectUid( configContext.org_uid ) ) {
                config.occurrenceScheme = _getObject( configContext.org_uid );
            } else if( clientDataModelSvc.isValidObjectUid( currentContext.currentState.pci_uid ) ) {
                pci = _getObject( currentContext.currentState.pci_uid );

                if( pci.props.fgf0PartitionScheme ) {
                    config.occurrenceScheme = pci.props.fgf0PartitionScheme;
                }
            }

            if( clientDataModelSvc.isValidObjectUid( configContext.baselinerev_uid ) ) {
                config.sourceContext = _getObject( configContext.baselinerev_uid );
            }

            if( configContext.de ) {
                config.effectivityDate = _convertDate( configContext.de );
            }

            config.unitNo = configContext.ue ? parseInt( configContext.ue ) : -1;

            var startDate = configContext.startDate;
            var fromUnit = configContext.fromUnit;
            var intentFormula = configContext.intentFormula;

            if( startDate || fromUnit || intentFormula ) {
                config.effectivityRanges = [];

                var effectivityRange = {};

                effectivityRange.dateIn = startDate;
                effectivityRange.dateOut = configContext.endDate;
                effectivityRange.unitIn = isNaN( fromUnit ) ? -1 : parseInt( fromUnit );
                effectivityRange.unitOut = isNaN( configContext.toUnit ) ? -1 : parseInt( configContext.toUnit );
                if( configContext.intentFormula ) {
                    effectivityRange.intentFormula = configContext.intentFormula;
                } else {
                    effectivityRange.intentFormula = '';
                }

                config.effectivityRanges[ 0 ] = effectivityRange;
            }
        }
    }

    // Change context modified in configuration panel
    var changeContext;
    if( appCtxService.ctx.changeContext ) {
        changeContext = appCtxService.ctx.changeContext;
        if( clientDataModelSvc.isValidObjectUid( changeContext.uid ) ) {
            config.changeContext = changeContext;
        }
    } else {
        // Retain change context when other config parameters changed
        if( clientDataModelSvc.isValidObjectUid( currentContext.currentState.pci_uid ) ) {
            pci = _getObject( currentContext.currentState.pci_uid );
        } else if( currentContext.productContextInfo ) {
            pci = _getObject( currentContext.productContextInfo.uid );
        }
        if( pci && !_.isEmpty( pci ) && pci.props && pci.props.fgf0ChangeContext ) {
            config.changeContext = _getObject( pci.props.fgf0ChangeContext.dbValues[ 0 ] );
        }
    }
};

var exports = {};

/**
 * @param {ResourceLoadInput} loadInput - Object containing specific loading parameters and options.
 * @param {ResourceOccurrencesData} soaInput - Input structure to getResourceOccurrences() SOA.
 * @param {CurrentAppContext} currentContext - Input current context
 * @returns {ResourceOccurrencesResp} - Response from getResourceOccurrences() SOA.
 */
export let getOccurrences = function( loadInput, soaInput, currentContext ) {
    var inputData = soaInput.inputData;

    if( appCtxService.getCtx( 'systemLocator' ) ) {
        occmgmtRequestPrefPopulatorService.populateRequestPrefParametersForLocator( inputData.requestPref,
            loadInput, currentContext );
    } else {
        inputData.product = _getObject( currentContext.currentState.uid );

        inputData.parentElement = loadInput.parentElement;

        _populateConfigurationParameters( inputData.config, currentContext );

        if( inputData.config.productContext.uid === _NULL_ID && loadInput.productContext ) {
            inputData.config.productContext = loadInput.productContext;
        }
        _populateCursorParameters( inputData.cursor, loadInput );

        if( !loadInput.skipFocusOccurrenceCheck ) {
            _populateFocusOccurrenceInputParameters( inputData, currentContext );
            if( inputData.resourceFocusOccurrenceInput.element === undefined && loadInput.focusInput !== null ) {
                inputData.resourceFocusOccurrenceInput.element = _getObject( loadInput.focusInput );
            }
        }

        occmgmtRequestPrefPopulatorService.populateRequestPrefParameters( inputData.requestPref, loadInput,
            currentContext, inputData.config );
        occmgmtRequestPrefPopulatorService.populateExpansionCriteriaParameters( inputData.expansionCriteria, currentContext );
    }
    if( currentContext ) {
        currentContext.getOccInput = soaInput;
    }
    return soaSvc.postUnchecked( 'Internal-ResourceManager-2019-12-ResourceOccurrencesManagement', 'getResourceOccurrences',
        //return soaSvc.postUnchecked( 'Internal-ActiveWorkspaceBom-2019-12-OccurrenceManagement', 'getOccurrences3',  
        soaInput ).then( function( response ) {
        var deferred = AwPromiseService.instance.defer();

        var isExpandBelowMode = false;
        if( !_.isEmpty( appCtxService.ctx ) && !_.isEmpty( appCtxService.ctx.aceActiveContext ) &&
            !_.isEmpty( appCtxService.ctx.aceActiveContext.context.expansionCriteria.scopeForExpandBelow ) ) {
            isExpandBelowMode = true;
        }

        if( response.partialErrors || response.ServiceData && response.ServiceData.partialErrors ) {
            mrmOccmgmtGetOccsResponseService.processPartialErrors( response );
        }
        deferred.resolve( response );
        return deferred.promise;
    }, function( error ) {
        mrmOccmgmtGetOccsResponseService.processFailedIndexError( error );
        throw soaSvc.createError( error );
    } );
};

/**
 * @returns {ResourceOccurrencesData} Input structure to getResourceOccurrences() SOA with default values.
 */
export let getDefaultSoaInput = function() {
    return {
        inputData: {
            config: {
                effectivityDate: '0001-01-01T00:00:00',
                unitNo: -1
            },
            cursor: {},
            resourceFocusOccurrenceInput: {},
            requestPref: {}
        }
    };
};

export default exports = {
    getOccurrences,
    getDefaultSoaInput
};
/**
 * @memberof NgServices
 * @member MrmOccmgmtGetService
 */
app.factory( 'MrmOccmgmtGetService', () => exports );
