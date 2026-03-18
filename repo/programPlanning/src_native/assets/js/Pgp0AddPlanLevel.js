// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 *
 * @module js/Pgp0AddPlanLevel
 */
import app from 'app';
import dateTimeSvc from 'js/dateTimeService';
import appCtxSvc from 'js/appCtxService';
import cmm from 'soa/kernel/clientMetaModel';
import cdm from 'soa/kernel/clientDataModel';
import tcServerVersion from 'js/TcServerVersion';
import eventBus from 'js/eventBus';

var exports = {};

export let createStyleSheet = function( data ) {
    var destPanelId = "CreateProjectSub";
    appCtxSvc.ctx.programPlanningContext.type1 = data.dataProviders.awTypeSelector.selectedObjects[ "0" ].props.type_name.dbValue;
    appCtxSvc.ctx.programPlanningContext.TypeTitle = data.dataProviders.awTypeSelector.selectedObjects[ "0" ].cellHeader1;
    var activePanel = data.getSubPanel( data.activeView );
    if( activePanel ) {
        activePanel.contextChanged = true;
    }
    var context = {
        destPanelId: destPanelId
    };

    eventBus.publish( "awPanel.navigate", context );
};

var getSelectedType = function() {
    if( appCtxSvc.ctx.pselected ) {
        return appCtxSvc.ctx.pselected.type;
    } else if( appCtxSvc.ctx.selected ) {
        return appCtxSvc.ctx.selected.type;
    }
};

/**
 * Return input for clonePlanHierarchyWithProject SOA
 *
 * @param {object} data - Data of ViewModelObject
 */
export let clonePlanHierarchyWithProjectInput = function( data ) {
    var ctxObj = appCtxSvc.ctx.selected;
    var propertyMap = {
        object_name: data.object_name.dbValue,
        object_desc: data.object_desc.dbValue
    };

    var date = new Date( data.dcdDateTime.dateApi.dateObject );
    var dateValue;
    dateValue = dateTimeSvc.formatUTC( date );
    var saveAsInputIn;
    var targetUid;
    var InfoMap;
    var OptionsMap;
    var programDeliverable;
    var checklist;

    if( data.isSupported ) {
        for( var lovMap in data.MapoflovValues ) {
            var index = data.target_program.dbValue.indexOf( '-' );
            var targetProgramId = data.target_program.dbValue.substring( 0, index - 1 );
            if( targetProgramId === data.MapoflovValues[ lovMap ].propDisplayValues.prg0PlanId[ 0 ] ) {
                targetUid = data.MapoflovValues[ lovMap ].uid;
                break;
            }
        }
        InfoMap = {
            CurrentSelection: {
                type: ctxObj.type,
                uid: ctxObj.uid
            },
            TargetProgram: {
                type: getSelectedType(),
                uid: targetUid
            }
        };
        if( typeof data.program_deliverable.dbValue === 'undefined' ) {
            programDeliverable = "false";
        } else {
            programDeliverable = "true";
        }
        checklist = "true";
        if( typeof data.checklist.dbValue === 'undefined' ) {
            checklist = "false";
        }
        OptionsMap = {
            includeProgramDeliverable: programDeliverable,
            includeChecklist: checklist
        };
    } else {
        InfoMap = {
            CurrentSelection: {
                type: ctxObj.type,
                uid: ctxObj.uid
            },
            TargetProgram: {
                type: ctxObj.type,
                uid: ctxObj.uid
            }
        };
        if( typeof data.program_deliverable.dbValue === 'undefined' ) {
            programDeliverable = "false";
        } else {
            programDeliverable = "true";
        }
        checklist = "true";
        if( typeof data.checklist.dbValue === 'undefined' ) {
            checklist = "false";
        }
        OptionsMap = {
            includeProgramDeliverable: programDeliverable,
            includeChecklist: checklist
        };
    }
    //Prepare SaveAs input
    saveAsInputIn = [ {
        cloneInfoMap: InfoMap,
        cloneOptionsMap: OptionsMap,
        primeEventDate: dateValue,
        propertyValuesMap: propertyMap
    } ];

    var returnedObject = {
        targetUid: targetUid,
        saveAsInputIn: saveAsInputIn
    };
    return returnedObject;
};

/**
 * Return input for clonePlanHierarch SOA
 *
 * @param {object} data - Data of ViewModelObject
 */
export let clonePlanHierarchyInput = function( data ) {
    var ctxObj = appCtxSvc.ctx.selected;
    var propertyMap = {
        object_name: data.object_name.dbValue,
        object_desc: data.object_desc.dbValue
    };

    var date = new Date( data.dcdDateTime.dateApi.dateObject );
    var dateValue;
    dateValue = dateTimeSvc.formatUTC( date );
    var saveAsInputIn;
    //Prepare SaveAs input
    saveAsInputIn = [ {
        planObject: ctxObj,
        primeEventDate: dateValue,
        propertyValueMap: propertyMap
    } ];
    return saveAsInputIn;
};

export let refreshTimelineOnCloneProjectWithSameTarget = function( data ) {
    if( typeof data.returnedObject.targetUid !== typeof undefined ) {
        var typeOfOpenedObject = appCtxSvc.ctx.locationContext.modelObject.modelType;
        var uidOfOpenedObject = appCtxSvc.ctx.locationContext.modelObject.uid;
        if( cmm.isInstanceOf( 'Prg0AbsProgramPlan', typeOfOpenedObject ) ) {
            return uidOfOpenedObject === data.returnedObject.targetUid;
        }
    }
    return false;

};

/**
 * Get domain list
 */
export let getDomainList = function( response ) {
    var domainList = [];

    for( var lovValRow in response.lovValues ) {
        if( response.lovValues.hasOwnProperty( lovValRow ) ) {
            var targetProgram = response.lovValues[ lovValRow ].propDisplayValues.prg0PlanId[ 0 ] + ' - ' +
                response.lovValues[ lovValRow ].propDisplayValues.object_name[ 0 ];
            domainList.push( targetProgram );
        }
    }

    return domainList;
};

/**
 * Checks whether TC server version is greater than or equal to TC11.2.3
 */
export let checkForVersionSupportForProject = function() {

    if( tcServerVersion.majorVersion > 11 ) {
        // For TC versions like TC12
        return true;
    }
    if( tcServerVersion.majorVersion < 11 ) {
        // For TC versions like TC10
        return false;
    }
    if( tcServerVersion.minorVersion > 2 ) {
        // For TC versions like TC11.3
        return true;
    }
    if( tcServerVersion.minorVersion < 2 ) {
        // For TC versions like TC11.1
        return false;
    }
    //compare only versions like TC11.2.2, TC11.2.3....
    return tcServerVersion.qrmNumber >= 3;
};

var isChildOfProgramPlan = function() {

    if( appCtxSvc.ctx.mselected[ 0 ].props.prg0ParentPlan !== undefined ) {
        var parentObjUid = appCtxSvc.ctx.mselected[ 0 ].props.prg0ParentPlan.dbValues[ 0 ];
        if( parentObjUid !== null ) {
            var parentPlanObj = cdm.getObject( parentObjUid );
            var typeOfSelectedObject = parentPlanObj.modelType;
            if( cmm.isInstanceOf( 'Prg0AbsProgramPlan', typeOfSelectedObject ) ||
                cmm.isInstanceOf( 'Prg0AbsProjectPlan', typeOfSelectedObject ) ) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    } else {
        return false;
    }

};

/**
 * Return for version support check and child of ProgramPlan check
 *
 * @param {object} data - Data of ViewModelObject
 */
export let populateData = function( data ) {

    var versionSupported = exports.checkForVersionSupportForProject();
    var programPlanchild = isChildOfProgramPlan();
    data.isTcVersionSupported = versionSupported;
    data.isProgramPlanchild = programPlanchild;
};

/**
 * Service to display Serial and Lot Number Panel.
 *
 * @member Pgp0AddPlanLevel
 * @memberof Pgp0AddPlanLevel
 */

export default exports = {
    createStyleSheet,
    clonePlanHierarchyWithProjectInput,
    clonePlanHierarchyInput,
    refreshTimelineOnCloneProjectWithSameTarget,
    getDomainList,
    checkForVersionSupportForProject,
    populateData
};
app.factory( 'Pgp0AddPlanLevel', () => exports );
