// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * navigation service for EasyPlan objects.
 *
 * @module js/epNavigationService
 */
import app from 'app';
import _ from 'lodash';
import pageService from 'js/page.service';
import epLoadInputHelper from 'js/epLoadInputHelper';
import epLoadService from 'js/epLoadService';
import AwStateService from 'js/awStateService';
import mfeTypeUtils from 'js/utils/mfeTypeUtils';
import { constants as epBvrConstants } from 'js/epBvrConstants';
import AwPromiseService from 'js/awPromiseService';
import appCtxService from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import messagingService from 'js/messagingService';
import localeService from 'js/localeService';
import { getPageContext } from 'js/epContextService';
import configurationService from 'js/configurationService';
import eventBus from 'js/eventBus';
import navigationSvc from 'js/navigationService';
import soaService from 'soa/kernel/soaService';
import policySvc from 'soa/kernel/propertyPolicyService';

'use strict';

const parentStateEasyPlan = 'com_siemens_splm_client_mfg_easyplan';
const parentStateEasyPlanTasks = 'easyplan';
const parentStateAdmin = 'com_siemens_splm_client_mfg_easyplan_admin_package';
const stateAceXrtShowObject = 'com_siemens_splm_clientfx_tcui_xrt_showObject';
const adminEasyPlanTasksState = 'manageWorkPackageNew';
let showObjectPolicyForPlant = null;

/**
 * This method is used to navigate to EasyPlan object
 * @param {Object} objectToNavigate - object to navigate
 * @param {Object} mcn - mcn id
 * @param {Object} navigateIn - the string which states if we want to navigate to a newTab or newWindow
 * @param { Object } keepSameState - the string which states if we want to navigate to the same state or default state
 * @param { Object } ignoreMCN - the string which states if we want to navigate with MCN or not
 * @param {Object} stateName - the string which states the name of subLocation to make a navigation to it
 */
export function navigateToObject( objectToNavigate, mcn, navigateIn, keepSameState = false, ignoreMCN = false, stateName ) {
    let modelObject;
    if( !objectToNavigate ) {
        return;
    }
    if( objectToNavigate.uid ) {
        modelObject = objectToNavigate;
    } else if( objectToNavigate.scopedUid ) {
        modelObject = cdm.getObject( objectToNavigate.scopedUid );
    } else {
        modelObject = cdm.getObject( objectToNavigate );
    }
    if( !modelObject ) {
        const loadTypeInputs = epLoadInputHelper.getLoadTypeInputs( 'Header', objectToNavigate );
        epLoadService.loadObject( loadTypeInputs, true ).then(
            function( result ) {
                let epObjectToNavigate = result.loadedObjects[ 0 ];
                navigateToObject( epObjectToNavigate, mcn, navigateIn, keepSameState, ignoreMCN, stateName );
            } );
    } else {
        mcn = ignoreMCN ? null : mcn || AwStateService.instance.params.mcn;

        if( stateName ) {
            navigate( stateName, { uid: modelObject.uid, mcn }, navigateIn );
        } else if( keepSameState ) {
            navigate( AwStateService.instance.current.name, { uid: modelObject.uid, mcn }, navigateIn );
        } else {
            getDefaultPage( modelObject, false ).then( function( navigationPageInfo ) {
                navigate( navigationPageInfo.name, { uid: navigationPageInfo.uid, mcn, selectedProc: navigationPageInfo.selectedProcess }, navigateIn );
            } );
        }
    }
}

/**
 * Navigating object new tab OR new window
 *
 * @param {string} stateName - given state name
 * @param {string} navigationParams - given uid
 * @param {string} navigateIn - the string which states if we want to navigate to a newTab or newWindow
 */
function navigate( stateName, navigationParams, navigateIn ) {
    const action = {
        actionType: 'Navigate',
        navigateTo: stateName
    };

    if( navigateIn ) {
        action.navigateIn = navigateIn;
    }

    navigationSvc.navigate( action, navigationParams );
}

/**
 * This method returns the default page to navigate depending on type of object
 * @param { Object } objectToNavigate object that user wants to navigate
 * @param { Boolean } isManagePage check if user wants to navigate to manage page
 * @returns { Object } defaultPage
 */
function getDefaultPage( objectToNavigate, isManagePage ) {
    let epObjectToNavigate = objectToNavigate;
    if( mfeTypeUtils.isOfType( epObjectToNavigate, epBvrConstants.ME_COLLABORATION_CONTEXT ) ) {
        return getDefaultPageForCC( epObjectToNavigate, isManagePage );
    } else if( mfeTypeUtils.isOfType( epObjectToNavigate, epBvrConstants.MFG_BVR_PROCESS ) ) {
        // on clicking process from breadcrumb expand that selected process on navigating FP
        let processInProductBop = epObjectToNavigate.uid;
        let object = epObjectToNavigate;
        while( getParent( object ) !== null ) {
            object = getParent( object );
            if( mfeTypeUtils.isOfType( object, epBvrConstants.MFG_PRODUCT_BOP ) ) {
                return getHighPriorityPageFromAvailablePages( object, processInProductBop );
            }
        }
    } else if( mfeTypeUtils.isOfType( epObjectToNavigate, epBvrConstants.MFG_PRODUCT_BOP ) ) {
        // on clicking productBop from breadcrumb expand that selected process from ctx on navigating FP
        let processInProductBop = appCtxService.getCtx( 'ep.navigateToProcessUnderProductBOP' );
        appCtxService.unRegisterCtx( 'ep.navigateToProcessUnderProductBOP' );
        return getHighPriorityPageFromAvailablePages( epObjectToNavigate, processInProductBop );
    } else if( mfeTypeUtils.isOfType( epObjectToNavigate, epBvrConstants.MFG_BVR_WORKAREA ) ) {
        return navigateToShowObjectPage( epObjectToNavigate );
    }
    return getHighPriorityPageFromAvailablePages( epObjectToNavigate );
}

/**
 * This method returns the default page to navigate depending on type of object CC contains
 * @param { Object } epObjectToNavigate object that user wants to navigate
 * @param { Boolean } isManagePage check if user wants to navigate to manage page
 * @returns { Object } defaultPage
 */
function getDefaultPageForCC( epObjectToNavigate, isManagePage ) {
    let awPromise = AwPromiseService.instance;
    const resource = localeService.getLoadedText( app.getBaseUrlPath() + '/i18n/EPMessages' );
    const loadTypeInput = epLoadInputHelper.getLoadTypeInputs( [ 'Header' ], epObjectToNavigate.uid );
    return awPromise.resolve( epLoadService.loadObject( loadTypeInput, true ).then(
        function( result ) {
            let epLoadedObjects = result.loadedObjects[ 0 ];
            epObjectToNavigate = isManagePage ? epObjectToNavigate : epLoadedObjects;
            const workspaceId = appCtxService.ctx.workspace.workspaceId;
            return configurationService.getCfg( 'mfeWorkspaceConfig' ).then( function( mfeWorkspaceConfig ) {
                const workspaceConfigCheck = Boolean( mfeWorkspaceConfig && mfeWorkspaceConfig[ workspaceId ] );
                let defaultWorkspaceError = 'noProcessStructureError';
                if( workspaceConfigCheck && mfeWorkspaceConfig[ workspaceId ].defaultError ) {
                    defaultWorkspaceError = mfeWorkspaceConfig[ workspaceId ].defaultError;
                }
                const errorMessage = resource[ defaultWorkspaceError ];
                if( epLoadedObjects ) {
                    if( workspaceConfigCheck && mfeWorkspaceConfig[ workspaceId ].defaultStructure ) {
                        if( mfeTypeUtils.isOfType( epLoadedObjects, mfeWorkspaceConfig[ workspaceId ].defaultStructure ) && epObjectToNavigate !== undefined ) {
                            return getHighPriorityPageFromAvailablePages( epObjectToNavigate );
                        }
                        messagingService.showError( errorMessage );
                    } else {
                        messagingService.showError( errorMessage );
                    }
                } else if( !isManagePage ) {
                    if( getPageContext().functionalPlan ) {
                        epObjectToNavigate = getPageContext().functionalPlan;
                        return getHighPriorityPageFromAvailablePages( epObjectToNavigate );
                    }
                    messagingService.showError( errorMessage );
                } else if( epObjectToNavigate !== undefined ) {
                    return getHighPriorityPageFromAvailablePages( epObjectToNavigate );
                }
            } );
        }
    ) );
}

/**
 *
 * @param {Object} epObjectToNavigate object to navigate
 * @param { String } processInProductBop ID of process to expand in productBop
 * @returns { Promise } promise with default page to navigate
 */
function getHighPriorityPageFromAvailablePages( epObjectToNavigate, processInProductBop ) {
    const awPromise = AwPromiseService.instance;
    if( mfeTypeUtils.isOfType( epObjectToNavigate, epBvrConstants.ME_COLLABORATION_CONTEXT ) ) {
        // TODO: Remove getAvailableSubpages call for parentStateAdmin once its removed.
        // -----------START-parentStateAdmin-----------
        return awPromise.resolve( pageService.getAvailableSubpages( parentStateAdmin, { epObjectToNavigate } ).then(
            ( subPages ) => {
                // -----------END-parentStateAdmin------------
                return {
                    name: subPages.length === 0 ? adminEasyPlanTasksState : _.minBy( subPages, 'data.priority' ).name,
                    uid: epObjectToNavigate.uid
                };
            }
        ) );
    }

    // TODO: Remove additional getAvailableSubpages call for parentStateEasyPlan 
    // once all Easy Plan pages move under parentStateEasyPlanTasks.
    // -----------START-parentStateEasyPlan-----------
    return awPromise.resolve( pageService.getAvailableSubpages( parentStateEasyPlan, { epObjectToNavigate } ).then(
        ( subPages ) => {
            // -----------END-parentStateEasyPlan------------
            return pageService.getAvailableSubpages( parentStateEasyPlanTasks, { epObjectToNavigate } ).then(
                ( tasksSubPages ) => {
                    subPages = subPages.concat( tasksSubPages );

                    let targetSubPage;
                    // if for the available sub pages for the target contain the current state,
                    // and the page has "stayOnPage" flag -
                    // navigate to this state (stay in the same page with different object)
                    const currentState = AwStateService.instance.current;
                    if( currentState.data && currentState.data.stayOnPage && _.includes( _.map( subPages, 'name' ), currentState.name ) ) {
                        targetSubPage = currentState.name;
                    } else {
                        // target sub page is the default one (defaultSubpagePriority). if default is not defined, it's the highest priority one (priority)
                        targetSubPage = _.sortBy( subPages, [
                            ( subPage ) => subPage.data.defaultSubpagePriority, // first sort by "default" to find the default
                            ( subPage ) => subPage.data.priority // then sort by order - as a fallback
                        ] )[ 0 ].name;
                    }
                    return {
                        name: targetSubPage,
                        uid: epObjectToNavigate.uid,
                        selectedProcess: processInProductBop
                    };
                } );
        }
    ) );
}

/**
 * This method subscribes event fired for navigation from hosted content
 * @returns { String } eventId to unsubscribe
 * TODO : To be removed once Hosting is removed.
 */
export function initForNavigationFromHosted() {
    return eventBus.subscribe( 'navigateToObjectFromHostedContent', function( data ) {
        //This check is explicitely added for navigation using commands from within hosted content
        //If current state is com_siemens_splm_client_mfg_easyplan, then only use epNavigationService so that
        //we can fetch available subPages and navigate to default subpage
        let routerMsg = data.routerMsg;
        if( routerMsg.ToState.name === 'com_siemens_splm_client_mfg_easyplan' ) {
            let objectToNavigate = cdm.getObject( routerMsg.ToParams.uid );
            if( objectToNavigate ) {
                navigateToObject( objectToNavigate );
            }
        } else {
            //state needs to be reloaded so that hosted subPage also gets fresh content while navigating
            //from within hosted subPage
            routerMsg.Options.reload = routerMsg.ToState.name;
            if( AwStateService.instance.params.mcn ) {
                routerMsg.ToParams.mcn = AwStateService.instance.params.mcn;
            }
            AwStateService.instance.go( routerMsg.ToState.name, routerMsg.ToParams, routerMsg.Options );
        }
    } );
}

/**
 * This method decides the manage page to navigate once we click on workPackage link
 * depending on the workspace. For PPP it should be 'managePlantBopPackage' and for WIA,
 * it should be 'manageLegacyBopPackage' page.
 * @param { Object } objectToNavigate object to navigate
 * @param { Object } navigateIn - the string which states if we want to navigate to a newTab or newWindow
 */
export function navigateToManagePage( objectToNavigate, navigateIn ) {
    getDefaultPage( objectToNavigate, true ).then( function( defaultPage ) {
        navigate( defaultPage.name, { uid: objectToNavigate.uid, mcn: AwStateService.instance.params.mcn }, navigateIn );
    } );
}

/**
 * Get parent uid of the object
 * @param {Object} object object of which parent object needs to be fetched
 * @returns {Object} uid of the parent object of the given object
 */
function getParent( object ) {
    if( object.props && object.props[ epBvrConstants.BL_PARENT ] && !_.isEmpty( object.props[ epBvrConstants.BL_PARENT ].dbValues ) ) {
        return cdm.getObject( object.props[ epBvrConstants.BL_PARENT ].dbValues[ 0 ] );
    }
    return null;
}

/**
 * Navigate to showObject page with all the required configurations loaded
 * @param {Object} epObjectToNavigate epObjectToNavigate
 * @returns {Promise} promise object
 */
function navigateToShowObjectPage( epObjectToNavigate ) {
    /* Need to register below property policy so that ACE page honors the loaded
    properties while loading the page and does not override with default property values */
    showObjectPolicyForPlant = {
        types: [ {
            name: 'Awb0ProductContextInfo',
            properties: [ {
                    name: 'awb0Product'
                },
                {
                    name: 'awb0CurrentRevRule'
                },
                {
                    name: 'awb0SupportedFeatures'
                },
                {
                    name: 'awb0EffDate'
                },
                {
                    name: 'awb0EffUnitNo'
                },
                {
                    name: 'awb0EffectivityGroups'
                },
                {
                    name: 'awb0VariantRules'
                },
                {
                    name: 'awb0VariantRuleOwningRev'
                },
                {
                    name: 'awb0ClosureRule'
                }
            ]
        } ]
    };
    policySvc.register( showObjectPolicyForPlant );
    let soaInput = {
        inputData: {
            product: {
                uid: epObjectToNavigate.props[ epBvrConstants.BL_REVISION ].dbValues[ 0 ],
                type: epObjectToNavigate.props[ epBvrConstants.BL_REV_OBJECT_TYPE ].dbValues[ 0 ]
            },
            config: {
                revisionRule: {
                    uid: appCtxService.ctx.ep.plantStructureInfo.uid,
                    type: appCtxService.ctx.ep.plantStructureInfo.type
                }
            }
        }
    };
    return soaService.postUnchecked( 'Internal-ActiveWorkspaceBom-2019-12-OccurrenceManagement', 'getOccurrences3', soaInput ).then(
        function( response ) {
            policySvc.unregister( showObjectPolicyForPlant );
            const prodContextInfo = response.ServiceData.modelObjects[ response.rootProductContext.uid ];
            navigate( stateAceXrtShowObject, {
                uid: epObjectToNavigate.props[ epBvrConstants.BL_REVISION ].dbValues[ 0 ],
                pci_uid: prodContextInfo.uid,
                cc_uid: appCtxService.ctx.epPageContext.collaborationContext.uid
            } );
        } );
}

// eslint-disable-next-line no-unused-vars
let exports = {};
export default exports = {
    navigateToObject,
    initForNavigationFromHosted,
    navigateToManagePage
};
