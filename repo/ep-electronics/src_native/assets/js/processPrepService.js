// Copyright (c) 2020 Siemens

/**
 * Service to launch desktop process planner.
 *
 * @module js/processPrepService
 */

import appCtxSvc from 'js/appCtxService';

/**
 * This function is to launch process preparation application from EP.
 *
 */
export let launchProcessPrep = function( ) {
        var currentCC = appCtxSvc.getCtx( "epPageContext" ).collaborationContext;
        var ccName = currentCC.props.object_string.uiValues[ 0 ];
        var cmd = '\/Integration:Valor.Gui.Interfaces.IProductManagerService;OpenFromTeamCenter \/Args:"LeaveOpen,';
        var cmdWithArgs = cmd + 'ccid=' + currentCC.uid + '|ccname=' + ccName + '"';
        window.open( 'ProcessPreparation:' + cmdWithArgs, '_self' );
};

let exports = {};

export default exports = {
    launchProcessPrep
};

