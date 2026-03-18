//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*global
 define
 */

/**
 * @module js/addClauseToRevRuleService
 */
import app from 'app';
import localeSvc from 'js/localeService';
import revisionRuleAdminCtx from 'js/revisionRuleAdminContextService';
import revRuleClauseDisplayTextService from 'js/revRuleClauseDisplayTextService';
import addRevRuleClausePropertyService from 'js/addRevRuleClausePropertyService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
var _localeTextBundle = null;

/**
 * update latest clause property when its updated from widget1
 *
 * @param {Object} data - data to generate clause
 * @returns {bool} data -false
 *
 */
function generateClauseToAdd( data ) {
    var newClause;
    var revRuleEntryKeyToValue = {};
    var displayText;
    var entryType = data.currentlySelectedClause.dbValue;
    switch ( entryType ) {
        case 0: // working
            newClause = {
                entryType: entryType
            };
            addRevRuleClausePropertyService.getUpdatedWorkingClause( data, newClause, true );
            break;
        case 1: //status
            newClause = {
                entryType: entryType
            };
            addRevRuleClausePropertyService.getUpdatedStatusClause( data, newClause, true );
            break;
        case 2: //override
            newClause = {
                entryType: entryType
            };
            addRevRuleClausePropertyService.getUpdatedOverrideClause( data, newClause, true );
            break;
        case 3: //date
            displayText = revRuleClauseDisplayTextService.getDisplayTextForClause( data, entryType, true );
            if( !data.addClause_date.error ) {
                var dateString = displayText.substring( displayText.indexOf( '(' ) + 1, displayText.indexOf( ')' ) ).trim();
                if( dateString === 'Today' ) {
                    dateString = '';
                }
                revRuleEntryKeyToValue.date = dateString;
            }
            revRuleEntryKeyToValue.today = data.addClause_today.dbValue.toString();
            newClause = {
                entryType: entryType,
                displayText: displayText,
                revRuleEntryKeyToValue: revRuleEntryKeyToValue,
                groupEntryInfo: {
                    listOfSubEntries: []
                }
            };
            break;
        case 4: //Unit
            displayText = revRuleClauseDisplayTextService.getDisplayTextForClause( data, entryType, true );
            if( !data.addClause_unit_no.error ) {
                revRuleEntryKeyToValue.unit_no = data.addClause_unit_no.dbValue.toString();
            }
            newClause = {
                entryType: entryType,
                displayText: displayText,
                revRuleEntryKeyToValue: revRuleEntryKeyToValue,
                groupEntryInfo: {
                    listOfSubEntries: []
                }
            };
            break;
        case 6: //Precise
            displayText = revRuleClauseDisplayTextService.getDisplayTextForClause( data, entryType, true );
            newClause = {
                entryType: entryType,
                displayText: displayText,
                revRuleEntryKeyToValue: revRuleEntryKeyToValue,
                groupEntryInfo: {
                    listOfSubEntries: []
                }
            };
            break;
        case 7: //Latest
            displayText = revRuleClauseDisplayTextService.getDisplayTextForClause( data, entryType, true );
            var ctx = revisionRuleAdminCtx.getCtx();
            revRuleEntryKeyToValue.latest = ctx.RevisionRuleAdmin.addClause_latestConfigType.configType.toString();
            newClause = {
                entryType: entryType,
                displayText: displayText,
                revRuleEntryKeyToValue: revRuleEntryKeyToValue,
                groupEntryInfo: {
                    listOfSubEntries: []
                }
            };
            break;
        case 8: //End Item
            newClause = {
                entryType: entryType
            };
            addRevRuleClausePropertyService.getUpdatedEndItemClause( data, newClause, true );
            break;
        default:
            break;
    }
    // to check if similar clause alredy exist
    if( newClause !== undefined && newClause.entryType !== undefined ) {
        var clauseCanBeAdded = true;
        if( newClause.entryType !== 3 && newClause.entryType !== 4 && newClause.entryType !== 8 ) {
            clauseCanBeAdded = checkClauseAddition( newClause, data );
        }
        if( clauseCanBeAdded ) {
            newClause.modified = true;
        } else {
            newClause = undefined;
        }
    }
    return newClause;
}

function checkClauseAddition( newClause, data ) {
    var clauseCanBeAdded = true;
    var dataProvider = data.dataProviders.getRevisionRuleInfoProvider;
    for( var inx = 0; inx < data.clauses.length; inx++ ) {
        var clauseFound = _.isEqual( data.clauses[ inx ].displayText, newClause.displayText );
        if( clauseFound ) {
            //if simlilar clause alredy exist then instead of adding new one , select back the existing one
            clauseCanBeAdded = false;
            dataProvider.selectionModel.setSelection( data.clauses[ inx ] );
            break;
        }
    }
    return clauseCanBeAdded;
}
/**
 * ***********************************************************<BR>
 * Define external API<BR>
 * ***********************************************************<BR>
 */
var exports = {};

/**
 * initialise AddClauses panel clause properties in the context and navigate to AddClauses panel
 *
 *
 */
export let launchAddClausePanel = function() {
    var ctx = revisionRuleAdminCtx.getCtx();
    if( ctx.RevisionRuleAdmin ) {
        ctx.RevisionRuleAdmin.addClause_status = 'Any';
        ctx.RevisionRuleAdmin.addClause_statusConfigType = {
            configType: '0',
            configDisplay: _localeTextBundle.releasedDate
        };
        ctx.RevisionRuleAdmin.addClause_latestConfigType = {
            configType: 0,
            configDisplay: _localeTextBundle.creationDate
        };
        ctx.RevisionRuleAdmin.isAddClausesPanelLoaded = true;
    }
    var eventData = {
        destPanelId: 'AddClauses',
        title: _localeTextBundle.addClausesPanelTitle,
        recreatePanel: true,
        supportGoBack: true
    };
    eventBus.publish( 'awPanel.navigate', eventData );
};

/**
 * update latest clause property when its updated from widget
 *
 * @param {Object} latestConfig - latestConfig widget property
 *
 */
export let upateLatestConfigForAddClauses = function( latestConfig ) {
    var latestConfigType = {
        configType: latestConfig.dbValue,
        configDisplay: latestConfig.uiValue
    };
    revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'addClause_latestConfigType', latestConfigType );
};

export let getClausesToAdd = function( data ) {
    var addDate = false;
    var addUnit = false;
    var addItem = false;
    data.clauses.forEach( function( clause ) {
        if( clause.entryType === 3 ) {
            addDate = true;
        } else if( clause.entryType === 4 ) {
            addUnit = true;
        } else if( clause.entryType === 8 ) {
            addItem = true;
        }
    } );

    var clausesToAdd = [ {
            propDisplayValue: _localeTextBundle.working,
            propInternalValue: 0
        },
        {
            propDisplayValue: _localeTextBundle.status,
            propInternalValue: 1
        },
        {
            propDisplayValue: _localeTextBundle.override,
            propInternalValue: 2
        },
        {
            propDisplayValue: _localeTextBundle.date,
            propInternalValue: 3
        },
        {
            propDisplayValue: _localeTextBundle.unit_no,
            propInternalValue: 4
        },
        {
            propDisplayValue: _localeTextBundle.precise,
            propInternalValue: 6
        },
        {
            propDisplayValue: _localeTextBundle.latest,
            propInternalValue: 7
        },
        {
            propDisplayValue: _localeTextBundle.endItemName,
            propInternalValue: 8
        }
    ];

    _.remove( clausesToAdd, function( clause ) {
        return clause.propInternalValue === 3 && addDate || clause.propInternalValue === 4 && addUnit ||
            clause.propInternalValue === 8 && addItem;
    } );

    data.clausesToAdd = clausesToAdd;
};

export let addClauseToRevRule = function( data ) {
    var dataProvider = data.dataProviders.getRevisionRuleInfoProvider;
    var newClause = generateClauseToAdd( data );
    //enable auto scroll because new clause will get added to bottom of the list which might not be visible
    var ctx = revisionRuleAdminCtx.getCtx();
    ctx.RevisionRuleAdmin.shouldEnableAutoScroll = true;

    if( newClause ) {
        data.clauses.push( newClause );
        dataProvider.update( data.clauses, data.clauses.length );
        dataProvider.selectionModel.setSelection( newClause );
        eventBus.publish( 'RevisionRuleAdminPanel.tagRevisionRuleAsModified' );
    }
};

_localeTextBundle = localeSvc.getLoadedText( app.getBaseUrlPath() + '/i18n/RevisionRuleAdminConstants' );

export default exports = {
    launchAddClausePanel,
    upateLatestConfigForAddClauses,
    getClausesToAdd,
    addClauseToRevRule
};
/**
 * @memberof NgServices
 * @member acerevisionRuleAdminPanelService
 */
app.factory( 'addClauseToRevRuleService', () => exports );
