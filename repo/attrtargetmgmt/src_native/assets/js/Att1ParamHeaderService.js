
// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@


/**
 * @module js/Att1ParamHeaderService
 */
import * as app from 'app';
import att1RevRuleConfSvc from 'js/Att1RevisionRuleConfigurationService';
import variantInfoConfSvc from 'js/Att1VariantInfoConfigurationService';
import _ from 'lodash';
var exports = {};

/**
 * Initialize the Revision Rule Configuration Section
 *
 * @param {Object} data - The 'data' object from viewModel.
 */
export let initializeParamHeader = function( data ) {
    if( data ) {
        //att1RevRuleConfSvc.populateConfPanelWithCurrentRevisionRule( data );
        //variantInfoConfSvc.getAppliedVariantRuleFromProject( data );
    }
};

export default exports = {
    initializeParamHeader
};
app.factory( 'Att1ParamHeaderService', () => exports );

