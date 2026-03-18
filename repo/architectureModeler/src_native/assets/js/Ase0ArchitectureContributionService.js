//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * Service for handling contributions to Architecture tab
 *
 * @module js/Ase0ArchitectureContributionService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import conditionService from 'js/conditionService';
import contributionService from 'js/contribution.service';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';

var exports = {};

/**
 * Get contributing panels
 *
 * @return {Promise} A Promise that will be resolved with the requested data when the data is available.
 */
export let populateContributedSecondaryPanels = function() {

    var deferred = AwPromiseService.instance.defer();
    //Get all of the command providers
    contributionService.require( 'archModelerSecondaryPanelKey' ).then( function( providers ) {

        if( providers && providers.length > 0 ) {

            var splitPanels = providers.map( function( panel, index ) {
                var newSplitPanel = {
                    selectedPanel: false,
                    visible: true,
                    panelIndex: index,
                    priority: panel.priority,
                    condition: panel.condition,
                    splitPanelId: panel.splitPanelId,
                    id: panel.id
                };
                return newSplitPanel;
            } );

            if( splitPanels ) {
                var architectureCtx = appCtxSvc.getCtx( "architectureCtx" );
                architectureCtx.contributingSplitPanels = splitPanels;

                var activeSplitPanel = exports.getActiveSpiltPanel( splitPanels );
                if( activeSplitPanel ) {
                    architectureCtx.activeSplitPanelId = activeSplitPanel.splitPanelId;
                } else {
                    architectureCtx.activeSplitPanelId = null;
                }
                appCtxSvc.updateCtx( "architectureCtx", architectureCtx );
            }
        } else {
            deferred.resolve( null );
        }
    } );

    return deferred.promise;
};

/**
 * Evaluate conditions for all given panels and return the one with valid condition and highest priority
 * @param {Array} panels all contributing panels
 * @returns {Object} active split panel
 */
export let getActiveSpiltPanel = function( panels ) {
    var activeSplitPanel = null;
    if( panels ) {
        _.forEach( panels, function( panel ) {
            if( panel.condition ) {
                if( typeof panel.condition === 'string' ) {
                    var isConditionTrue = conditionService.evaluateCondition( {
                        ctx: appCtxSvc.ctx
                    }, panel.condition );
                    if( isConditionTrue ) {
                        if( !activeSplitPanel || panel.priority < activeSplitPanel.priority ) {
                            activeSplitPanel = panel;
                        }
                    }
                }
            }
        } );
    }
    return activeSplitPanel;
};

/**
 * This factory creates a service and returns exports
 *
 * @member Ase0ArchitectureContributionService
 */

export default exports = {
    populateContributedSecondaryPanels,
    getActiveSpiltPanel
};
app.factory( 'Ase0ArchitectureContributionService', () => exports );
