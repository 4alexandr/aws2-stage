// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define,
 document
 */

/**
 * This is the command handler for show object command which is contributed to cell list.
 *
 * @module js/showRequirementsOpenCommandHandler
 */
import * as app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import commandSvc from 'js/command.service';

var exports = {};

/**
 *
 * @param {ViewModelObject} context - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {Object} $scope - scope object in which isVisible and isEnabled flags needs to be set.
 */
export let setCommandContext = function( context, $scope ) {
    $scope.cellCommandVisiblilty = true;
};

/**
 * Execute the command.
 * <P>
 * The command context should be setup before calling isVisible, isEnabled and execute.
 *
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 */
export let execute = function( vmo ) {
    if( vmo && vmo.uid ) {
        var modelObject = cdm.getObject( vmo.uid );

        if( modelObject && modelObject.props.ase0RelatedElement && modelObject.props.ase0RelatedElement.dbValues &&
            modelObject.props.ase0RelatedElement.dbValues.length > 0 ) {
            modelObject = cdm.getObject( modelObject.props.ase0RelatedElement.dbValues[ 0 ] );
        }

        var commandContext = {
            "vmo": modelObject || vmo, // vmo needed for gwt commands
            "edit": false
        };

        commandSvc.executeCommand( 'Awp0ShowObjectCell', null, null, commandContext );
    }
};

export default exports = {
    setCommandContext,
    execute
};
/**
 * @memberof NgServices
 * @member showRequirementsOpenCommandHandler
 *
 * @param {Object} cdm soa_kernel_clientDataModel
 * @param {Object} commandSvc command service
 *
 * @return {Object} service exports
 */
app.factory( 'showRequirementsOpenCommandHandler', () => exports );
