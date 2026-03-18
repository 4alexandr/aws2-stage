// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * native construct to hold the server version information related to the AW server release.
 *
 * @module propRenderTemplates/briefcaseCheckOutRenderer
 * @requires app
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';

var exports = {};

/**
 * Generates
 * @param { Object } vmo - ViewModelObject for which checked out is being rendered
 * @param { Object } containerElem - The container DOM Element inside which checked out user icon will be rendered
 */
export let briefcaseSiteCheckoutRendererFn = function( vmo, containerElem , columnName, tooltip) {

    if (  vmo.props &&  vmo.props.checked_out )
    {
        var checked_out = vmo.props.checked_out.dbValues[0];

        if ( checked_out === 'Y' )
        {
            if ( vmo.props.checked_out_user )
            {
                var checked_out_user = vmo.props.checked_out_user.dbValues[0];
                if ( checked_out_user && vmo.props.checked_out_user.displayValues !== null )
                {
                    var displayNameOfCheckoutUser = vmo.props.checked_out_user.displayValues[0];
                    var uiVlaueOfCheckoutUser = vmo.props.checked_out_user.uiValue;
                    //Display name has format "bcz_test user1 (bcz_test_user1)

                    var checkOutUserObject = cdm.getObject( checked_out_user );

                    if ( checkOutUserObject  !== null )
                    {
                        if( checkOutUserObject.modelType.typeHierarchyArray.indexOf( 'POM_user' ) > -1 )
                        {
                            if ( checkOutUserObject.props.user_name )
                            {
                                var userName = checkOutUserObject.props.user_name.dbValues[0];

                                var n = displayNameOfCheckoutUser.indexOf(userName);

                                //Prior to tc13.1, checked_out_user UID is user UID and not site UID
                                //for site checkout.
                                if ( n === -1 )
                                {
                                    var imagePath1 = app.getBaseUrlPath() + '/image/indicatorBriefcaseCheckOut16.svg';
                                    var cellImg1 = createCellImage (imagePath1, uiVlaueOfCheckoutUser, tooltip, vmo);
                                    containerElem.appendChild( cellImg1 );
                                }
                                else
                                {
                                    var imagePath = app.getBaseUrlPath() + '/image/indicatorCheckedOut16.svg';
                                    var cellImg = createCellImage (imagePath, uiVlaueOfCheckoutUser, tooltip, vmo);
                                    containerElem.appendChild( cellImg );
                                }
                            }
                        }
                        else if( checkOutUserObject.modelType.typeHierarchyArray.indexOf( 'POM_imc' ) > -1 )
                        {
                            const newLocal = '/image/indicatorBriefcaseCheckOut16.svg';
                            var imagePath = app.getBaseUrlPath() + newLocal;
                            var cellImg = createCellImage (imagePath, uiVlaueOfCheckoutUser, tooltip, vmo);
                            containerElem.appendChild( cellImg );
                        }
                    }
                }
          }
      }
    }

};

let createCellImage = function(imagePath, displayNameOfCheckoutUser, tooltipProps, vmo)
{
    var toolTip = "";
    if( tooltipProps ){
        _.forEach( tooltipProps, function( tooltipPropName ){
            if( vmo.props[ tooltipPropName ] ){
                var toolTipPropName = vmo.props[ tooltipPropName ].propertyDisplayName;
                var toolTipPropVal =  vmo.props[ tooltipPropName ].uiValue;
                if( toolTipPropVal ){
                    toolTip += toolTipPropName + ": " + toolTipPropVal + '\n';
                }
            }
        });
    }

    var cellImg = document.createElement( 'img' );
    cellImg.className = 'aw-visual-indicator';
    cellImg.title = toolTip;
    cellImg.src = imagePath;
    cellImg.alt = toolTip;
    return cellImg;
};

export default exports = {
    briefcaseSiteCheckoutRendererFn
};
app.factory( 'briefcaseSiteCheckoutRendererFn', () => exports );
