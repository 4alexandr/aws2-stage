// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Ctm1ContentMgmtService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import AwHttpService from 'js/awHttpService';
import modelPropertySvc from 'js/modelPropertyService';
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import appCtxService from 'js/appCtxService';
import fileMgmtSvc from 'soa/fileManagementService';
import fmsUtils from 'js/fmsUtils';
import browserUtils from 'js/browserUtils';
import localeSvc from 'js/localeService';
import AwStateService from 'js/awStateService';

/**
 * The FMS proxy servlet context. This must be the same as the FmsProxyServlet mapping in the web.xml
 */
var WEB_XML_FMS_PROXY_CONTEXT = 'fms';

/**
 * Relative path to the FMS proxy download service.
 */
var CLIENT_FMS_DOWNLOAD_PATH = WEB_XML_FMS_PROXY_CONTEXT + '/fmsdownload/';

var exports = {};

// Model Property service

var _localizedText = {};

/**
 * This method is used to get the list from soa response.
 * @param {Object} response the response of the soa
 * @returns {Array} value the LOV value
 */
export let getLovFromQuery = function( response ) {
    var value;

    if( response.searchResults ) {
        value = response.searchResults.map( function( obj ) {
            if( obj.modelObject.props.languageName ) {
                return {
                    propDisplayValue: obj.modelObject.props.languageName.uiValues[ 0 ],
                    propInternalValue: obj.modelObject.uid
                };
            }

            return {
                propDisplayValue: obj.modelObject.props.object_name.uiValues[ 0 ],
                propInternalValue: obj.modelObject.uid,
                propInternalType: obj.modelObject.type
            };
        } );
    } else if( response.lovValues ) {
        value = response.lovValues.map( function( obj ) {
            return {
                propDisplayValue: obj.propDisplayValues.lov_values[ 0 ],
                propInternalValue: obj.propInternalValues.lov_values[ 0 ]
            };
        } );
    }

    return value;
};

/**
 * This method is used to get the list from a preference.
 * @param {Array} pref the preference
 * @returns {Array} value the LOV value
 */
export let getLovFromPref = function( pref ) {
    var value;

    if( pref ) {
        value = pref.map( function( obj ) {
            return {
                propDisplayValue: obj.split( ',' )[ 0 ],
                propInternalValue: obj
            };
        } );
    }

    return value;
};

export let downloadDataset = function( data ) {
    var imanFile = null;

    // get Named reference File
    if( data.dataset.props.ref_list && data.dataset.props.ref_list.dbValues.length > 0 ) {
        imanFile = data.dataset.props.ref_list.dbValues[ 0 ];
    } else {
        dmSvc.getProperties( [ data.dataset.uid ], [ 'ref_list' ] ).then( function() {
            // get Named reference File
            if( data.dataset.props.ref_list && data.dataset.props.ref_list.dbValues.length > 0 ) {
                imanFile = data.dataset.props.ref_list.dbValues[ 0 ];
            }
        } );
    }

    // Get iman file object from uid
    var imanFileModelObject = cdm.getObject( imanFile );

    // downloadTicket
    var files = [ imanFileModelObject ];
    var promise = fileMgmtSvc.getFileReadTickets( files );
    promise.then( function( readFileTicketsResponse ) {
        var originalFileName = null;
        if( readFileTicketsResponse && readFileTicketsResponse.tickets && readFileTicketsResponse.tickets.length > 1 ) {
            var imanFileArray = readFileTicketsResponse.tickets[ 0 ];
            if( imanFileArray && imanFileArray.length > 0 ) {
                var imanFileObj = cdm.getObject( imanFileArray[ 0 ].uid );
                if( imanFileObj.props ) {
                    originalFileName = imanFileObj.props.original_file_name.uiValues[ 0 ];
                    originalFileName.replace( ' ', '_' );
                }
            }
            var ticketsArray = readFileTicketsResponse.tickets[ 1 ]; // 1st element is array of iman file while 2nd element is array of tickets
            if( ticketsArray && ticketsArray.length > 0 ) {
                downloadFileInternal( buildUrlFromFileTicket( ticketsArray[ 0 ], originalFileName ) );
            }
        }
    } );
};

export let getLanguageList = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    var checkBoxModels = [];

    deferred.promise.then( function( response ) {
        var selObj = appCtxService.ctx.selected;
        var transOffice = cdm.getObject( selObj.props.fnd0TrnslOfficeTagref.dbValues[ 0 ] );

        for( var i = 0; i < transOffice.props.languagesTbl.dbValues.length; i++ ) {
            var langTbl = cdm.getObject( transOffice.props.languagesTbl.dbValues[ i ] );
            var langObj = cdm.getObject( langTbl.props.fnd0LanguageTagref.dbValues[ 0 ] );

            var lang = {
                displayName: langObj.props.object_name.uiValues[ 0 ],
                type: 'BOOLEAN',
                isRequired: 'false',
                isEditable: 'true',
                dbValue: '',
                dispValue: '',
                labelPosition: 'PROPERTY_LABEL_AT_RIGHT'
            };

            var langVMP = modelPropertySvc.createViewModelProperty( lang );
            langVMP.obj = langObj;
            checkBoxModels.push( langVMP );
        }

        data.dataProviders.languageListProvider.update( checkBoxModels, checkBoxModels.length );
    } );

    deferred.resolve();

    return checkBoxModels;
};

/**
 * This method is used to get the Language list from soa response.
 * @param {Object} response the response of the soa
 * @returns {Array} value the LOV value
 */
export let getLanguageResponseList = function( response ) {
    var value = exports.getLovFromQuery( response );

    value.unshift( {
        propDisplayValue: '(Master Language)',
        propInternalValue: '(Master Language)'
    } );

    return value;
};

/**
 * This method is used to get the default language.
 * @param {Object} data the view data
 * @returns {Object} value the LOV value
 */
export let getDefaultLanguage = function( data ) {
    if( data.preferences.ctm0DefaultLanguage.length > 0 ) {
        return data.preferences.ctm0DefaultLanguage[ 0 ];
    }

    return '*';
};

/**
 * This method is used to get the Language value.
 * @param {Object} response the response of the soa
 * @param {Object} data the view data
 * @returns {Object} value the LOV value
 */
export let setLanguage = function( response, data ) {
    if( response && response.searchResults && response.searchResults.length > 0 ) {
        data.revision__ctm0MasterLanguageTagref.uiValue = response.searchResults[ 0 ].modelObject.props.languageName.uiValues[ 0 ];
        data.revision__ctm0MasterLanguageTagref.dbValue = response.searchResults[ 0 ].modelObject.uid;

        return exports.getLovFromQuery( response );
    } else if( data.language && data.languageList && data.preferences.ctm0DefaultLanguage.length > 0 ) {
        for( var i = 0; i < data.languageList.length; ++i ) {
            if( data.languageList[ i ].propDisplayValue === data.preferences.ctm0DefaultLanguage[ 0 ] ) {
                data.language.uiValue = data.languageList[ i ].propDisplayValue;
                data.language.dbValue = data.languageList[ i ].propInternalValue;
                break;
            }
        }
    }
};

var buildUrlFromFileTicket = function( fileTicket, overrideFileName ) {
    var fileName = fmsUtils.getFilenameFromTicket( fileTicket );
    var downloadUri = CLIENT_FMS_DOWNLOAD_PATH + fileName + '?ticket=' +
        fileTicket.substring( fileTicket.indexOf( '=' ) + 1 );
    var baseUrl = browserUtils.getBaseURL();
    var urlFullPath = baseUrl + downloadUri;

    if( overrideFileName !== undefined && overrideFileName.length > 0 ) {
        fileName = overrideFileName;
    }

    return { fileName, urlFullPath };
};

var downloadFileInternal = function( info ) {
    //IE doesn't support download attribute; need alternative method to download correct filename
    var browserIsIE = navigator.userAgent.indexOf( 'MSIE' ) > -1 || navigator.appVersion.indexOf( 'Trident/' ) > -1;

    if( !browserIsIE ) {
        // Create an invisible A element
        const a = document.createElement( 'a' );
        a.style.display = 'none';
        document.body.appendChild( a );

        // Set the HREF to a Blob representation of the data to be downloaded
        a.href = info.urlFullPath;

        // Use download attribute
        a.setAttribute( 'download', info.fileName );

        // Trigger the download by simulating click
        a.click();

        // Cleanup
        window.URL.revokeObjectURL( a.href );
        document.body.removeChild( a );
    } else {
        //IE section
        //Get blob from XML Http Request, then call the
        //msSaveBlob function (supported in IE).
        var xhr = new XMLHttpRequest();
        xhr.open( 'GET', info.urlFullPath, true );
        xhr.responseType = 'blob';
        xhr.onload = function() {
            navigator.msSaveBlob( this.response, info.fileName );
        };
        xhr.send();
    }
};

export let downloadFile = function( data ) {
    var fileTicket = data.composedData[ 0 ].composedTransientFileReadTicket;
    //window.open( buildUrlFromFileTicket( fileTicket ), '_self', 'enabled' );
    downloadFileInternal( buildUrlFromFileTicket( fileTicket ) );
};

export let getCheckBoxData = function( lov, data, paramName, initialValue = 'true' ) {
    var checkBoxModels = [];

    for( var i = 0; i < lov.length; ++i ) {
        var checkBoxModel = {
            displayName: lov[ i ].propDisplayValue,
            type: 'BOOLEAN',
            isRequired: 'false',
            isEditable: 'true',
            dbValue: initialValue,
            uiValue: initialValue,
            dispValue: '',
            labelPosition: 'PROPERTY_LABEL_AT_RIGHT'
        };

        var prop = modelPropertySvc.createViewModelProperty( checkBoxModel );
        prop.internalValue = lov[ i ].propInternalValue;

        checkBoxModels.push( prop );
    }

    // Update data.paramName to contain the checkbox list
    if( data && paramName ) {
        data[ paramName ] = checkBoxModels;
    }

    return checkBoxModels;
};

export let getDitaValueFilters = function( data ) {
    var ticket = data.eventData.composedData[ 0 ][ 0 ].composedTransientFileReadTicket;
    var info = buildUrlFromFileTicket( ticket );

    var promise = AwHttpService.instance.get( info.urlFullPath );
    promise.then( function( response ) {
        if( response.data && response.data.length > 0 ) {
            var list = [];
            var sArray = response.data.split( '\n' );
            for( var i = 0; i < sArray.length; ++i ) {
                var sString = sArray[ i ].trim();

                if( sString.length > 0 ) {
                    var row = {
                        propDisplayValue: sString,
                        propInternalValue: sString.split( ',' )[ 0 ]
                    };

                    list.push( row );
                }
            }

            data.ditaValueFiltersList = exports.getCheckBoxData( list, null, null, 'true' );
            data.dataProviders.ditaValueFilters.update( data.ditaValueFiltersList, data.ditaValueFiltersList / length );
        }
    } );
};

var getCheckedArray = function( list, checked = 'TRUE' ) {
    var array = [];

    // Find all checked or unchecked rows in list
    for( var i = 0; i < list.length; ++i ) {
        var dbVal = 'FALSE';
        if( list[ i ].dbValue === true ) {
            dbVal = 'TRUE';
        }

        var dispVal = list[ i ].displayValues[ 0 ].toUpperCase();
        if( dbVal === checked || dispVal === checked ) {
            array.push( list[ i ] );
        }
    }

    return array;
};

export let getChecked = function( list, checked = 'TRUE' ) {
    // Find all checked or unchecked rows in list
    var array = getCheckedArray( list, checked );

    // append array items to one string
    var rString = '';
    for( var i = 0; i < array.length; ++i ) {
        var value = array[ i ].propertyName;

        // If the value already has comma; then exclude it with the preceding text
        var n = value.indexOf( ',' );
        if( n > 0 ) {
            value = value.split( ',' )[ 0 ];
        }

        rString += value + ',';
    }

    // remove extra comma character
    if( rString.length > 0 ) {
        rString = rString.substring( 0, rString.length - 1 );
    }

    return rString;
};

export let getObject = function( uid ) {
    return cdm.getObject( uid );
};

export let rejectSuggestions = function( suggestion ) {
    var valid = true;
    var message = '';

    if( suggestion ) {
        valid = false;
        if( _localizedText.invalidValue ) {
            message = _localizedText.invalidValue.replace( '{0}', suggestion );
        }
    }

    return {
        valid: valid,
        message: message
    };
};

/**
 * This method redirects the user from the Notification message directly to the Topic it is about.
 * @param {Object} notificationObject the Notification clicked on
 */
export let openLineItem = function( notificationObject ) {
    var targetObj = cdm.getObject( notificationObject.object.props.fnd0TargetObject.dbValues[ 0 ] );

    var state = AwStateService.instance;

    var showObject = 'com_siemens_splm_clientfx_tcui_xrt_showObject';
    var toParams = {};
    var options = {};

    toParams.uid = targetObj.uid;
    options.inherit = false;

    state.go( showObject, toParams, options );
};

/**
 * This function determines the user's browser,
 * then downloads the XMetaL launch file using the appropriate method per browser.
 * @param {String} uid the uid of the Topic to be opened
 * @param {String} itemId the item ID of the Topic to be opened
 */
export let openInXMetaL = function( uid, itemId ) {
    var launchFileContents = generateLaunchFileContents( uid, itemId );
    var hrefValue = 'data:application/openxmetal;charset=utf-8,' + encodeURIComponent( launchFileContents );
    var filename = 'openinxmetal.awctm';

    //firefox doesn't automatically open files generated by javascript,
    //so we use the old method of asking for a server response
    var browserIsFirefox = navigator.userAgent.indexOf( 'Firefox' ) > -1;

    //IE doesn't support download attribute; need alternative method to download correct filename
    var browserIsIE = navigator.userAgent.indexOf( 'MSIE' ) > -1 || navigator.appVersion.indexOf( 'Trident/' ) > -1;

    if( browserIsIE ) {
        var file = new Blob( [ launchFileContents ], { type: 'application/openxmetal' } );
        navigator.msSaveOrOpenBlob( file, filename );
    } else if( browserIsFirefox ) {
        //the code for the launcher is part of the gateway code
        var uriToLaunch = browserUtils.getBaseURL() + 'launcher/openinxmetal?uid=' + uid + '&itemId=' + itemId;
        window.open( uriToLaunch, '_self', 'enabled' );
    } else {
        var a = document.createElement( 'a' );
        a.setAttribute( 'href', hrefValue );
        a.setAttribute( 'download', filename );

        if( document.createEvent ) {
            var event = document.createEvent( 'MouseEvents' );
            event.initEvent( 'click', true, true );
            a.dispatchEvent( event );
        } else {
            a.click();
        }
    }
};

/**
 * This function generates the contents of the XMetaL launch file.
 * @param {String} uid the uid of the Topic to be opened
 * @param {String} itemId the item ID of the Topic to be opened
 * @returns {String} content the complete text of the launch file
 */
var generateLaunchFileContents = function( uid, itemId ) {
    var content = '<?xml version="1.0" encoding="ISO-8859-1"?>';
    content += '<xmetal>\n';
    content += '<uid>' + uid + '</uid>\n';
    content += '<itemId>' + itemId + '</itemId>\n';
    content += '</xmetal>';
    return content;
};

/**
 * This is a test function, used for development.
 * @param {Object} a test
 * @param {Object} b test
 * @param {Object} c test
 * @param {Object} d test
 */
export let test = function( a, b, c, d ) {
    console.log( 'test a=' + a + ' b=' + b + ' c=' + c + ' d=' + d );

    return;
};

var loadConfiguration = function() {
    localeSvc.getTextPromise( 'ContentMgmtMessages', true ).then(
        function( localTextBundle ) {
            _localizedText = localTextBundle;
        } );
};

loadConfiguration();

/**
 * Ctm1ContentMgmtService factory
 */

export default exports = {
    getLovFromQuery,
    getLovFromPref,
    downloadDataset,
    getLanguageList,
    getLanguageResponseList,
    getDefaultLanguage,
    setLanguage,
    downloadFile,
    getCheckBoxData,
    getDitaValueFilters,
    getChecked,
    getObject,
    rejectSuggestions,
    openLineItem,
    openInXMetaL,
    test
};
app.factory( 'Ctm1ContentMgmtService', () => exports );
