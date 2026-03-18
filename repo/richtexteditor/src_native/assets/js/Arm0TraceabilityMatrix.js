/* eslint-disable max-lines */
// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Module for the Requirement Documentation Page
 *
 * @module js/Arm0TraceabilityMatrix
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import listBoxService from 'js/listBoxService';
import awColumnSvc from 'js/awColumnService';
import awTableSvc from 'js/awTableService';
import AwPromiseService from 'js/awPromiseService';
import uwPropertySvc from 'js/uwPropertyService';
import commandPanelService from 'js/commandPanel.service';
import requirementsUtils from 'js/requirementsUtils';
import reqTraceabilityMatrixService from 'js/reqTraceabilityMatrixService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import $ from 'jquery';
import localStorage from 'js/localStorage';
import fmsUtils from 'js/fmsUtils';
import soaSvc from 'soa/kernel/soaService';


var exports = {};
var cellDataMap = {};
var _flatTableColumnInfos = null;
var _flatTableRows = null;
var _data;
var _ctx;
var tlTypeListIn = [ 'ALL' ];
var tracelinkIDVsMatrixCell = {};
var matrixType = null;
var sourceObjects2 = [];
var targetObjects2 = [];
var matrixType = null;
var nullProductContext = 'AAAAAAAAAAAAAA';
var revToOccMap = {};
var _page_size = 25;
var _selectedCell = null;
var showEmptyRowsandColsActionState = true;
var parentRowUid = null;
var parentColUid = null;

var haveFullData = false;
var cachedRows;
var cachedCols;
var useCachedData = false;
var getChildMatrixServiceData = null;
/**
 * OpenCreateTracelinkPanel
 *
 * @param {Object}
 *            elementsInCreateTracelink elementsInCreateTracelink
 */
export let OpenCreateTracelinkPanel = function( elementsInCreateTracelink ) {
    if ( elementsInCreateTracelink && elementsInCreateTracelink.sourceObject && elementsInCreateTracelink.destObject ) {
        _data.cellSelected = true;
        var sourceObjects = [];
        var destObjects = [];
        var arrModelObjs = [];
        for ( var i = 0; i < elementsInCreateTracelink.sourceObject.uid.length; i++ ) {
            var sourceObject = { uid: elementsInCreateTracelink.sourceObject.uid[i] };
            sourceObjects.push( sourceObject );
            arrModelObjs.push( sourceObject );
        }
        for ( var j = 0; j < elementsInCreateTracelink.destObject.uid.length; j++ ) {
            var destObject = { uid: elementsInCreateTracelink.destObject.uid[j] };
            destObjects.push( destObject );
            arrModelObjs.push( destObject );
        }
        var cellProp = [ 'awb0UnderlyingObject', 'object_string' ];
        appCtxService.registerCtx( 'isOpenFromTraceabilityMatrix', 'true' );
        requirementsUtils.loadModelObjects( arrModelObjs, cellProp ).then( function() {
            _data.tracelinkSourceObject = [];
            _data.tracelinkDestinationObject = [];
            var sourceObjectRevision = [];
            var destObjectRevision = [];
            for ( var i = 0; i < elementsInCreateTracelink.sourceObject.uid.length; i++  ) {
                var sourceObjectRevision1 = reqTraceabilityMatrixService.getRevisionObject( cdm.getObject( sourceObjects[i].uid ) );
                sourceObjectRevision[i] = sourceObjectRevision1;
                var tracelinkSourceObject = requirementsUtils.getTracelinkObject( elementsInCreateTracelink.sourceObject.uid[i], sourceObjectRevision[i].uid );
                _data.tracelinkSourceObject[i] = tracelinkSourceObject;
            }
            for ( var j = 0; j < elementsInCreateTracelink.destObject.uid.length; j++ ) {
                var destObjectRevision1 = reqTraceabilityMatrixService.getRevisionObject( cdm.getObject( destObject.uid ) );
                destObjectRevision[j] = destObjectRevision1;
                var tracelinkDestinationObject = requirementsUtils.getTracelinkObject( elementsInCreateTracelink.destObject.uid[j], destObjectRevision[j].uid );
                _data.tracelinkDestinationObject[j] = tracelinkDestinationObject;
            }
            if ( _data.srcContextInfo && _data.srcContextInfo.uid !== nullProductContext ) {
                elementsInCreateTracelink.rowProductContextFromMatrix = _data.srcContextInfo.uid;
            } else { elementsInCreateTracelink.isTraceabilityMatrixObject = true; }
            eventBus.publish( 'requirementDocumentation.addObjectToTracelinkPanel', elementsInCreateTracelink );
        } );
    }
};

/**
 * OpenCloseCreateTracelinkPanel
 *
 * @param {Object}
 *            elementsInCreateTracelink elementsInCreateTracelink
 * @param {Object}
 *            ctx ctx
 */
export let OpenCloseCreateTracelinkPanel = function( elementsInCreateTracelink, ctx ) {
    if ( ctx.CreateTraceLinkPopupCtx ) {
        // If Create tracelink panel is already opened, close it
        eventBus.publish( 'CreateTracelinkPopup.Close' );
    } else if ( _selectedCell ) {
        elementsInCreateTracelink = {
            sourceObject: { uid: _selectedCell.rowUid },
            destObject: { uid: _selectedCell.colUid }
        };
        exports.OpenCreateTracelinkPanel( elementsInCreateTracelink );
    }
};

/**
 * processResponse
 *
 * @param {Object}
 *            response response
 */
export let processResponse = function( response ) {
    fmsUtils.openFile( response.generatedFileTicket, appCtxService.ctx.selected.props.object_name.dbValues[ 0 ] + '.pdf' );
};

/**
 * updateFileContentInFormData
 *
 * @param {Object}
 *            data data
 */
export let updateFileContentInFormData = function( data, extra ) {
    //main_svg
    var form = $( '#fileUploadForm' );
    data.formData = new FormData( $( form )[0] );
    var svgElement = document.getElementById( 'main_svg' );
    var clonedElement = svgElement.cloneNode( true );
    clonedElement.setAttribute( 'xmlns', 'http://www.w3.org/2000/svg' );
    data.formData.append( 'fmsFile', new Blob( [ clonedElement.outerHTML ], { type: 'text/plain' } ) );
    data.formData.append( 'fmsTicket', _data.fmsTicket );
    data.height = parseInt( svgElement.getAttribute( 'height' ) );
    data.width = parseInt( svgElement.getAttribute( 'width' ) );
    _data.formData = data.formData;
    eventBus.publish( 'Arm0TraceabilityMatrix.uploadFile' );
};

/**
 * tracelinkDeleted
 *
 * @param {Object}
 *            elementsInDeleteTracelink elementsInDeleteTracelink
 */
export let tracelinkDeleted = function( elementsInDeleteTracelink ) {
    if ( _data ) {
        reqTraceabilityMatrixService.tracelinkDeleted( elementsInDeleteTracelink, tracelinkIDVsMatrixCell, cellDataMap );
        processData( _data, null );
    }
};

/**
 * @return {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 */
var _getFlatTableColumnInfos = function() {
    if ( !_flatTableColumnInfos ) {
        _flatTableColumnInfos = reqTraceabilityMatrixService.buildFlatTableColumnInfos( awColumnSvc );
    }

    return _flatTableColumnInfos;
};

/**
 * loadFlatTableColumns
 *
 * @param {Object}
 *            uwDataProvider uwDataProvider
 * @return {promise}
 *            deferred promise
 */
export let loadFlatTableColumns = function( uwDataProvider ) {
    var deferred = AwPromiseService.instance.defer();

    uwDataProvider.columnConfig = {
        columns: _getFlatTableColumnInfos()
    };

    deferred.resolve( {
        columnInfos: _getFlatTableColumnInfos()
    } );

    return deferred.promise;
};

/**
 * loadFlatTableData
 *
 * @param {Object}
 *            data data
 * @return {promise}
 *            deferred promise
 */
export let loadFlatTableData = function( data ) {
    _flatTableRows = reqTraceabilityMatrixService._buildFlatTableRows( data, _getFlatTableColumnInfos(), uwPropertySvc );

    var deferred = AwPromiseService.instance.defer();

    var loadResult = awTableSvc.createTableLoadResult( _flatTableRows.length );

    loadResult.searchResults = _flatTableRows;
    loadResult.searchIndex = 0;
    loadResult.totalFound = _flatTableRows.length;

    deferred.resolve( loadResult );

    return deferred.promise;
};

/**
 * Display popup with Tracelink information on cell
 *
 * @param {Object}
 *            data - The panel's view model object
 * @param {Object}
 *            ctx - The context
 */
export let showTracelinksPopup = function( data, ctx ) {
    var rowUid = [];
    var colUid = [];
    var eventDataFromShowTracelink = data.eventMap['Arm0Traceability.showTracelinksPopup'];
    rowUid = eventDataFromShowTracelink.rowUid;
    colUid = eventDataFromShowTracelink.colUid;
    var isMultipleSelection = eventDataFromShowTracelink.isMultipleSelection;
    var tracelinkRowData = [];
    _selectedCell = null;
    if ( rowUid[0] && colUid[0] && rowUid[0] !== -1 && colUid[0] !== -1 ) {
        _selectedCell = _.cloneDeep( data.eventData );

        appCtxService.registerCtx( 'Arm0TraceabilityMatrixSelectedCell', _selectedCell );
        _selectedCell.sourceObject = [];
        _selectedCell.destObject = [];
        var linkInfo = [];
        if ( data.eventData.operationType === 'colWise' ) {
            for ( var i = 0; i < rowUid.length; i++ ) {
                var inputObject = {
                    uid: rowUid[i]
                };
                _selectedCell.sourceObject.push( inputObject );
                var key = rowUid[i].concat( '+' ).concat( colUid[0] );
                linkInfo.push( cellDataMap[key] );
            }
            _selectedCell.destObject[0] = {
                uid: colUid[0]
            };
        } else if ( data.eventData.operationType === 'rowWise' ) {
            for ( var j = 0; j < colUid.length; j++ ) {
                var inputObject = {
                    uid: colUid[i]
                };
                _selectedCell.destObject.push( inputObject );
                var key = rowUid[0].concat( '+' ).concat( colUid[j] );
                linkInfo.push( cellDataMap[key] );
            }
            _selectedCell.sourceObject[0] = {
                uid: rowUid[0]
            };
        } else {
            _selectedCell.sourceObject[0] = {
                uid: rowUid[0]
            };
            _selectedCell.destObject[0] = {
                uid: colUid[0]
            };
            var key = rowUid[0].concat( '+' ).concat( colUid[0] );
            linkInfo.push( cellDataMap[key] );
        }
        ctx.matrixCellSelected = true;
        if ( _data.srcContextInfo ) {
            ctx.rowProductContextFromMatrix = _data.srcContextInfo.uid;
        }
        ctx.srcObjectFromMatrix = rowUid[0];
        if( appCtxService.ctx.CreateTraceLinkPopupCtx ) {
            ctx.panelContext = {};
            ctx.panelContext.sourceObject = {};
            ctx.panelContext.destObject = {};

            var cellProp = [ 'awp0CellProperties', 'awb0UnderlyingObject' ];
            ctx.panelContext.sourceObject.uid = rowUid;
            ctx.panelContext.destObject.uid = colUid;
            requirementsUtils.loadModelObjects( [ ctx.panelContext.sourceObject, ctx.panelContext.destObject ], cellProp ).then( function() {
                ctx.panelContext.sourceObject = cdm.getObject( rowUid );
                ctx.panelContext.destObject = cdm.getObject( colUid );
                var sourceObjectRevision = reqTraceabilityMatrixService.getRevisionObject( cdm.getObject( rowUid ) );
                var destObjectRevision = reqTraceabilityMatrixService.getRevisionObject( cdm.getObject( colUid ) );

                _data.tracelinkSourceObject = requirementsUtils.getTracelinkObject( rowUid, sourceObjectRevision.uid );
                _data.tracelinkDestinationObject = requirementsUtils.getTracelinkObject( colUid, destObjectRevision.uid );
            } );
        }
        var linkInfoObjectArr = [];
        for ( var k = 0; k < linkInfo.length; k++ ) {
            if ( linkInfo[k] ) {
                linkInfoObjectArr.push( linkInfo[k] );
            }
        }
        if ( linkInfoObjectArr.length ) {
            for( var l = 0; l < linkInfoObjectArr.length; l++ ) {
                var linkInfoObject = linkInfoObjectArr[l];
                _.forEach( linkInfoObject.complyingLinksInfo, function( linkInfoObject ) {
                    if ( data.tlType.dbValue === linkInfoObject.tracelinkType || data.tlType.dbValue === 'ALL' ) {
                        var infoTracelink = requirementsUtils.readTracelinkInfo( linkInfoObject );
                        tracelinkRowData.push( infoTracelink );
                    }
                } );

                _.forEach( linkInfoObject.definingLinksInfo, function( linkInfoObject ) {
                    if ( data.tlType.dbValue === linkInfoObject.tracelinkType || data.tlType.dbValue === 'ALL' ) {
                        var infoTracelink = requirementsUtils.readTracelinkInfo( linkInfoObject );
                        tracelinkRowData.push( infoTracelink );
                    }
                } );
            }
        }
    } else {
        data.cellSelected = false;
        ctx.matrixCellSelected = false;
        appCtxService.unRegisterCtx( 'Arm0TraceabilityMatrixSelectedCell' );
    }
    data.tracelinkTableData = tracelinkRowData;
    if ( !isMultipleSelection ) {
    eventBus.publish( 'Arm0Traceability.refreshTableData' );
    }
};

export let closeMatrixTablePropView = function() {
    var eventData = {
        colUid: '-1',
        rowUid: '-1'
    };
    eventBus.publish( 'Arm0Traceability.showTracelinksPopup', eventData );
};

/**
 * Stuff row title and col title into one packet.
 *
 * @param {Object} data The context
 * @return {Object} Object // row and collumn title
 */
var stuffLabelData = function( data, ctx ) {
    var rt = data.srcObjectInfo.displayName;
    var ct = data.targetObjectInfo.displayName;

    return {
        row_title: rt,
        col_title: ct
    };
};

/**
 * Initialize HTML content
 *
 * @param {Object}
 *            data - The panel's view model object
 * @param {Object}
 *            ctx - The context
 */
export let processDataFromServer = function( data, ctx ) {
    ctx.MatrixContext.matrixObj = ctx.mselected[0];

    if ( !data.pageInfo ) {
        reqTraceabilityMatrixService.resetPageInfo( data );
    }

    /*
    * Important: clone rowObjects and colObjects and cache as globals this is needed for matrix row expand/collapse operations.
    */
    _data.clonedRowObjects = _.cloneDeep( _data.rowObjects );
    _data.clonedColObjects = _.cloneDeep( _data.colObjects );

    if ( data.targetObjectInfo !== undefined && data.srcObjectInfo !== undefined ) {
        if ( data.matrixType === 'Full-Rollup Matrix' || data.matrixType === 'Quick Matrix' ) {
            var _tmpSource = {
                uid: data.srcObjectInfo.occurrence.uid
            };
            var _tmpTarget = {
                uid: data.targetObjectInfo.occurrence.uid
            };

            _loadAndSetSourceTargetObjects( ctx, _tmpSource, _tmpTarget );
            _setSourceTargetProductContext( ctx, data.srcContextInfo, data.targetContextInfo );
        }
        ctx.matrixType = data.matrixType;

        ctx.generateTracebilityMatrixOnReveal = false;

        if ( data.matrixType === 'Full-Rollup Matrix' || data.matrixType === 'Dynamic Matrix' ) {
            ctx.tlmTreeMode = false;
        }

        if ( data.matrixType === 'Full-Rollup Matrix' ) {
            applyFullRollupServiceData( data );
        } else {
            applyServiceData( data );
        }

        if ( !ctx.tlmTreeMode ) {
            // list mode, replace model with new data
            cellDataMap = getCellMap( data, data.tracelinkInfo );
        } else {
            // in tree mode new data has to be merged into moded
            var cells = getCellMap( data, data.tracelinkInfo );
            _.merge( cellDataMap, cells );

            /*
            * IMPORTANT : In the case of parent rows and cols
            */
            if ( ctx.MatrixContext.parentRows && !parentRowUid ) {
                // column was expanded so keep old rows
                data.rowObjects = ctx.MatrixContext.parentRows;
            }
            if ( parentRowUid ) {
                var newRows = [];
                _.forEach( ctx.MatrixContext.parentRows, function( obj ) {
                    newRows.push( obj );
                    if ( obj.occurrence.uid === parentRowUid ) {
                        obj.isExpanded = true;
                        newRows = newRows.concat( data.rowObjects );
                    }
                } );
                data.rowObjects = newRows;
                parentRowUid = null;
                ctx.MatrixContext.parentRows = newRows;
            }

            if ( ctx.MatrixContext.parentCols && !parentColUid ) {
                // row was expanded so keep old columns
                data.colObjects = ctx.MatrixContext.parentCols;
            }
            if ( parentColUid ) {
                var newCols = [];
                _.forEach( ctx.MatrixContext.parentCols, function( obj ) {
                    newCols.push( obj );
                    if ( obj.occurrence.uid === parentColUid ) {
                        obj.isExpanded = true;
                        newCols = newCols.concat( data.colObjects );
                    }
                } );
                data.colObjects = newCols;
                parentColUid = null;
                ctx.MatrixContext.parentCols = newCols;
            }

            data.targetParentObjectInfo = '';
            data.srcParentObjectInfo = '';
        }

        /*
        * IMPORTANT : preserve original source and target objects in tree mode
        */
        if ( !ctx.MatrixContext.peakSrcInfo ) {
            ctx.MatrixContext.peakSrcInfo = data.srcObjectInfo;
            ctx.MatrixContext.peakTargetInfo = data.targetObjectInfo;
        }

        if ( ctx.tlmTreeMode ) {
            data.srcObjectInfo = ctx.MatrixContext.peakSrcInfo;
            data.targetObjectInfo = ctx.MatrixContext.peakTargetInfo;
        }

        if ( !ctx.tlmTreeMode ) {
            sortAndFilterEmpties( data, ctx );
        }

        processData( data, ctx );
    }
    return;
};

/**
 * Add up the number of links for each row and column. Set the totalLinkCount of row and
 * column objects.
 * @param {object} data Contains row, column and tracelink information
 */
var calculateLinkCounts = function( data ) {
    var rowLinks = new Map();
    var colLinks = new Map();
    _.forEach( data.tracelinkInfo, function( linkObj ) {
        var rowVal = rowLinks.get( linkObj.rowObject.uid );
        var colVal = colLinks.get( linkObj.colObject.uid );
        rowLinks.set( linkObj.rowObject.uid, rowVal ? rowVal + linkObj.numLinks : linkObj.numLinks );
        colLinks.set( linkObj.colObject.uid, colVal ? colVal + linkObj.numLinks : linkObj.numLinks );
    } );
    _.forEach( data.rowObjects, function( obj ) {
        var cnt = rowLinks.get( obj.occurrence.uid );
        obj.totalLinkCnt = cnt ? cnt : 0;
    } );
    _.forEach( data.colObjects, function( obj ) {
        var cnt = colLinks.get( obj.occurrence.uid );
        obj.totalLinkCnt = cnt ? cnt : 0;
    } );
};

/**
 * Filter out the rows and columns with no tracelinks.
 * @param {object} data Contains row and column information
 * @param {object} ctx matrix context
 */
var sortAndFilterEmpties = function( data, ctx ) {
    // if empty rows/columns are rmoved from view model a copy is needed
    // so no server call is required for restore
    if ( useCachedData ) {
        // remove empty rows/columns turned off, restore complete data
        data.rowObjects = cachedRows;
        data.colObjects = cachedCols;
        useCachedData = false;
    }

    var sortRow = ctx.MatrixContext.sortRow;
    var sortCol = ctx.MatrixContext.sortCol;
    if ( !showEmptyRowsandColsActionState || sortRow || sortCol ) {
        calculateLinkCounts( data );
    }

    if ( showEmptyRowsandColsActionState ) {
        cachedRows = data.rowObjects;
        cachedCols = data.colObjects;
    } else {
        // filter empty rows and columng
        var filteredRows = [];
        _.forEach( data.rowObjects, function( obj ) {
            if ( obj.totalLinkCnt > 0 ) {
                filteredRows.push( obj );
            }
        } );
        data.rowObjects = filteredRows;
        var filteredCols = [];
        _.forEach( data.colObjects, function( obj ) {
            if ( obj.totalLinkCnt > 0 ) {
                filteredCols.push( obj );
            }
        } );
        data.colObjects = filteredCols;
    }

    // apply sort
    if ( sortRow === 'total' ) {
        data.rowObjects.sort( function( a, b ) {
            return b.totalLinkCnt - a.totalLinkCnt;
        } );
    } else if ( sortRow ) {
        data.rowObjects.sort( function( a, b ) {
            var link1 = cellDataMap[ a.occurrence.uid.concat( '+' ).concat( sortRow ) ];
            var link2 = cellDataMap[ b.occurrence.uid.concat( '+' ).concat( sortRow ) ];
            return ( link2 ? link2.numOfLinksOnChildren : 0 ) - ( link1 ? link1.numOfLinksOnChildren : 0 );
        } );
    }
    if ( sortCol === 'total' ) {
        data.colObjects.sort( function( a, b ) {
            return b.totalLinkCnt - a.totalLinkCnt;
        } );
    } else if ( sortCol ) {
        data.colObjects.sort( function( a, b ) {
            var link1 = cellDataMap[ sortCol.concat( '+' ).concat( a.occurrence.uid ) ];
            var link2 = cellDataMap[ sortCol.concat( '+' ).concat( b.occurrence.uid ) ];
            return ( link2 ? link2.numOfLinksOnChildren : 0 ) - ( link1 ? link1.numOfLinksOnChildren : 0 );
        } );
    }
};


/**
 * Function to apply setting to re-generate Tracelability Matrix
 *
 * Important: open panel with ctx parameter so that the panel is popualted with the current states of ctx engine.
 *
 * @param {DeclViewModel} data - The declViewModel data context object.
 */
export let applyMatrixSettings = function( data, ctx ) {
    ctx.showObjectName = data.showObjectName.dbValue;
    ctx.showObjectId = data.showObjectId.dbValue;
    ctx.showObjectOwner = data.showObjectOwner.dbValue;
    ctx.showTracelinkDirection = data.showTracelinkDirection.dbValue;

    eventBus.publish( 'Arm0Traceability.applyMatrixSettings', ctx );

    eventBus.publish( 'complete', {
        source: 'toolAndInfoPanel'
    } );
};

/**
 * Capture serviceData from  SOA. It contains property values needed for
 * changing row/col header display names.
 * Important: This only gets called when on nagivate because it needs child uids.
 * Important2: The way this component was designed does not allow passing the service data directly
 *  This uses workaround to store service data as global and global is read afterwards in processData phase.
 * Todo: Fix this: We need better soa call to avoid the global workaround.
 * @param {object} serviceData Service data
 */
export let setServiceData = function( serviceData ) {
    getChildMatrixServiceData = serviceData.modelObjects;
};

/**
 * Adds properties that may be used as different labels for rows and columns headers
 * For each row object include the parent, id, and owner. Do the same for columns.
 *
 * @param {object} data view model
 */
var applyServiceData = function( data ) {

    
    if( !getChildMatrixServiceData ) 
    {
        //Note: The workaroud for the SOA not returning serviceData.
        if( data.ServiceData === undefined ) {
            
            _.forEach( data.rowObjects, function( obj )  
            { 
                obj.name = obj.displayName;
            });
            
            _.forEach( data.colObjects, function( obj )  
            {
                obj.name = obj.displayName;
            });

            return;
        }
        
        _.forEach( data.rowObjects, function( obj )  {
            var occObject = obj.occurrence;
            if ( occObject &&  occObject.props.awb0Parent ) {
                obj.parentUid = occObject.props.awb0Parent.dbValues[0];
                if(occObject.props.awb0ArchetypeId.dbValues[0]){
                    obj.id = occObject.props.awb0ArchetypeId.dbValues[0];
                }
                obj.owner = occObject.props.awb0ArchetypeRevOwningUser.uiValues[0];
            } else {
                if(occObject.props.item_id){
                    obj.id = occObject.props.item_id.dbValues[0];
                }
            }
            obj.name = obj.name ? obj.name : obj.displayName;
        } );

        _.forEach( data.colObjects, function( obj )  {
            var occObject = obj.occurrence;
            if ( occObject && occObject.props.awb0Parent ) {
                obj.parentUid = occObject.props.awb0Parent.dbValues[0];
                if(occObject.props.awb0ArchetypeId.dbValues[0]){
                    obj.id = occObject.props.awb0ArchetypeId.dbValues[0];
                }
                obj.owner = occObject.props.awb0ArchetypeRevOwningUser.uiValues[0];
            }
            else{
                if(occObject.props.item_id){
                    obj.id = occObject.props.item_id.dbValues[0];
                }
            }
            obj.name = obj.name ? obj.name : obj.displayName;
        } );
        
    } else {
        _.forEach( data.rowObjects, function( obj )  {
            var occObject = getChildMatrixServiceData[obj.occurrence.uid];
            if ( occObject &&  occObject.props.awb0Parent ) {
                obj.parentUid = occObject.props.awb0Parent.dbValues[0];
                obj.id = occObject.props.awb0ArchetypeId.dbValues[0];
                obj.owner = occObject.props.awb0ArchetypeRevOwningUser.uiValues[0];
            }
            obj.name = obj.name ? obj.name : obj.displayName;
        } );

        _.forEach( data.colObjects, function( obj )  {
            var occObject = getChildMatrixServiceData[obj.occurrence.uid];
            if ( occObject && occObject.props.awb0Parent ) {
                obj.parentUid = occObject.props.awb0Parent.dbValues[0];
                obj.id = occObject.props.awb0ArchetypeId.dbValues[0];
                obj.owner = occObject.props.awb0ArchetypeRevOwningUser.uiValues[0];
            }
            obj.name = obj.name ? obj.name : obj.displayName;
        } );
    }
};

/**
 * special case for fruit rollup matrix
 *
 * @param {object} data view model
 */
var applyFullRollupServiceData = function( data ) {

    _.forEach( data.rowObjects, function( obj )  {
        obj.name = obj.name ? obj.name : obj.displayName;
    } );

    _.forEach( data.colObjects, function( obj )  {
        obj.name = obj.name ? obj.name : obj.displayName;
    } );
};

/**
 * Reset cached information related to full sort and remove emtpy rows and columns
 * @param {object} ctx matrix context
 */
var resetFullDataCache = function( ctx ) {
    cachedRows = {};
    cachedCols = {};
    useCachedData = false;
    haveFullData = false;
    if ( ctx ) {
        ctx.MatrixContext.sortRow = null;
        ctx.MatrixContext.sortCol = null;
    }
    showEmptyRowsandColsActionState = true;
};

/**
 * Contructs the cell data map with key as combination of column and row uid
 * @param {Object} data - The panel's view model object
 * @param {object} tracelinkInfo Info about trace links between structures
 * @return {Object} cellData of a grid
 */
var getCellMap = function( data, tracelinkInfo ) {
    var cellDataMap = {};
    if ( tracelinkInfo ) {
        _.forEach( tracelinkInfo, function( traceLinkObj ) {
            var mapKey = traceLinkObj.rowObject.uid;
            mapKey = mapKey.concat( '+' ).concat( traceLinkObj.colObject.uid );
            var reverseMapKey = traceLinkObj.colObject.uid.concat( '+' ).concat( traceLinkObj.rowObject.uid );
            cellDataMap[mapKey] = traceLinkObj;
            traceLinkObj.numLinks = traceLinkObj.numOfLinksOnChildren;

            traceLinkObj.definingLinksInfo.forEach( function( linkInfo ) {
                tracelinkIDVsMatrixCell[linkInfo.tracelink.uid] = [ mapKey, reverseMapKey ];
                if ( tlTypeListIn.indexOf( linkInfo.tracelinkType ) === -1 ) {
                    tlTypeListIn.push( linkInfo.tracelinkType );
                }
            } );
            traceLinkObj.complyingLinksInfo.forEach( function( linkInfo ) {
                tracelinkIDVsMatrixCell[linkInfo.tracelink.uid] = [ mapKey, reverseMapKey ];
                if ( tlTypeListIn.indexOf( linkInfo.tracelinkType ) === -1 ) {
                    tlTypeListIn.push( linkInfo.tracelinkType );
                }
            } );
        } );
    }
    data.tlTypeList = listBoxService.createListModelObjectsFromStrings( tlTypeListIn );
    return cellDataMap;
};

export let getLinkTypes = function( data, ctx ) {
    data.tlTypeList = listBoxService.createListModelObjectsFromStrings( tlTypeListIn );
    return data.tlTypeList;
};

/**
 * Build string to display in cell
 * @param {object} linkInfo trace link information
 * @param {boolean} show trace link count is true if show child rollup count is toggle which suppresses arrows
 * @return {String} cell display value
 */
var getCellValue = function( linkInfo, showCount ) {
    var cellValue = '';
    if ( linkInfo ) {
        if ( !showCount && !_data.showFullRollupCase && linkInfo.numOfLinksOnChildren > 0 ) {
            if ( linkInfo.tracelinkDirection === 'Complying' ) {
                cellValue = 'COMPLYING';
            } else if ( linkInfo.tracelinkDirection === 'Defining' ) {
                cellValue = 'DEFINING';
            } else if ( linkInfo.tracelinkDirection === 'Both' ) {
                cellValue = 'BOTH';
            }
        }
        if ( linkInfo.numOfLinksOnChildren > 0 ) {
            cellValue += linkInfo.numOfLinksOnChildren;
        }
    }
    return cellValue;
};

/**
 * refreshTraceabilityMatrix
 */
export let refreshTraceabilityMatrix = function( ) {
    eventBus.publish( 'requirementDocumentation.navigate', {} );
};

/**
 *  Update tracelink matrix ino locally on creation of new tracelink
 *
 * @param {object} data view model
 * @param {object} primObj primary object
 * @param {object} secObj secondary object
 * @param {object} relationObj relation object
 *
 */
var _cacheNewTracelinkCreated = function( data, primObj, secObj, relationObj ) {
    data.cacheTracelinks = {};
    var linkInfo = {};
    linkInfo.primaryObjectPropInfo = [];
    linkInfo.secObjectPropInfo = [];
    linkInfo.tracelinkPropInfo = [];
    linkInfo.tracelinkType = relationObj.props.relation_type.uiValues[0];
    var primRev;
    if ( primObj.modelType.typeHierarchyArray.indexOf( 'Awb0ConditionalElement' ) === -1 ) {
        var obj = { propValues: [ primObj.props.object_name.dbValues[0] ] };
        primObj.elementUid = data.tracelinkSourceObject.revisionUid === primObj.uid ? data.tracelinkSourceObject.elementUid : data.tracelinkDestinationObject.elementUid;
        if ( primObj.modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) > -1 ) {
            primObj.elementUid = revToOccMap[primObj.uid];
        }
    } else {
        primRev = reqTraceabilityMatrixService.getRevisionObject( cdm.getObject( primObj.uid ) );
        obj = { propValues: [ primRev.props.object_name.dbValues[0] ] };
    }

    var primaryObjectPropInfo1 = obj;

    var primaryObjectPropInfo2 = {
        propValues: [
            primRev ? primRev.modelType.displayName : primObj.modelType.displayName
        ]
    };

    var secRev;
    if ( secObj.modelType.typeHierarchyArray.indexOf( 'Awb0ConditionalElement' ) === -1 ) {
        obj = { propValues: [ secObj.props.object_name.dbValues[0] ] };
        secObj.elementUid = data.tracelinkSourceObject.revisionUid === secObj.uid ? data.tracelinkSourceObject.elementUid : data.tracelinkDestinationObject.elementUid;
        if ( secObj.modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) > -1 ) {
            secObj.elementUid = revToOccMap[secObj.uid];
        }
    } else {
        secRev = reqTraceabilityMatrixService.getRevisionObject( cdm.getObject( secObj.uid ) );
        obj = { propValues: [ secRev.props.object_name.dbValues[0] ] };
    }
    var secObjectPropInfo1 = obj;
    var secObjectPropInfo2 = {
        propValues: [ secRev ? secRev.modelType.displayName : secObj.modelType.displayName ]
    };

    var tracelinkPropInfo = {
        name: 'name',
        propValues: [ relationObj.props.object_string.uiValues[0] ]
    };

    linkInfo.primaryObjectPropInfo.push( primaryObjectPropInfo1 );
    linkInfo.primaryObjectPropInfo.push( primaryObjectPropInfo2 );
    linkInfo.secObjectPropInfo.push( secObjectPropInfo1 );
    linkInfo.secObjectPropInfo.push( secObjectPropInfo2 );
    linkInfo.tracelinkPropInfo.push( tracelinkPropInfo );
    linkInfo.tracelinkDirection = 'Complying';
    linkInfo.tracelink = relationObj;
    var key = ( primObj.elementUid || primObj.uid ).concat( '+' ).concat( secObj.elementUid || secObj.uid );
    var arrCachedTracelink = data.cacheTracelinks[key];

    if ( !arrCachedTracelink ) {
        arrCachedTracelink = {};
    }

    arrCachedTracelink = linkInfo;
    data.cacheTracelinks[key] = arrCachedTracelink;

    var keyReverse = ( secObj.elementUid || secObj.uid ).concat( '+' ).concat( primObj.elementUid || primObj.uid );
    arrCachedTracelink = data.cacheTracelinks[keyReverse];

    if ( !arrCachedTracelink ) {
        arrCachedTracelink = {};
    }

    var deepCopiedLinkInfo = _.cloneDeep( linkInfo );
    deepCopiedLinkInfo.tracelinkDirection = 'Defining';
    deepCopiedLinkInfo.primaryObjectPropInfo = [];
    deepCopiedLinkInfo.secObjectPropInfo = [];
    deepCopiedLinkInfo.primaryObjectPropInfo.push( secObjectPropInfo1 );
    deepCopiedLinkInfo.primaryObjectPropInfo.push( secObjectPropInfo2 );

    deepCopiedLinkInfo.secObjectPropInfo.push( primaryObjectPropInfo1 );
    deepCopiedLinkInfo.secObjectPropInfo.push( primaryObjectPropInfo2 );

    arrCachedTracelink = deepCopiedLinkInfo;
    data.cacheTracelinks[keyReverse] = arrCachedTracelink;

    pushNewLink( key, data, primObj, secObj, linkInfo );
    pushNewLink( keyReverse, data, secObj, primObj, deepCopiedLinkInfo );
};

/**
 * pushNewLink
 *
 * @param {Object}
 *            key key
 * @param {Object}
 *            data data
 * @param {Object}
 *            primObj primObj
 * @param {Object}
 *            secObj secObj
 * @param {Object}
 *            linkInfo linkInfo
 */
var pushNewLink = function( key, data, primObj, secObj, linkInfo ) {
    var found = false;
    if ( cellDataMap[key] ) {
        var matrixObject = cellDataMap[key];
        matrixObject.numOfLinksOnChildren += 1;
        cellDataMap[key].definingLinksInfo.push( data.cacheTracelinks[key] );
        if ( cellDataMap[key].tracelinkDirection !== linkInfo.tracelinkDirection ) {
            cellDataMap[key].tracelinkDirection = 'Both';
        }
        found = true;
    }

    if ( !found ) {
        var matrixCellInfo = getMatrixCellInfoObject( primObj, secObj, linkInfo.tracelinkDirection, linkInfo );
        data.tracelinkInfo.push( matrixCellInfo );

        if ( tlTypeListIn.indexOf( data.eventData.relationObjects[0].modelType.displayName ) === -1 ) {
            tlTypeListIn.push( data.eventData.relationObjects[0].modelType.displayName );
        }
        data.tlTypeList = listBoxService.createListModelObjectsFromStrings( tlTypeListIn );
    }
};

/**
 * getMatrixCellInfoObject
 *
 * @param {Object}
 *            primaryObject primaryObject
 * @param {Object}
 *            secondaryObject secondaryObject
 * @param {Object}
 *            tracelinkDirection tracelinkDirection
 * @param {Object}
 *            linkInfo linkInfo
 * @return {Array}
 *            newTracelinkInfo
 */
var getMatrixCellInfoObject = function( primaryObject, secondaryObject, tracelinkDirection, linkInfo ) {
    var newTracelinkInfo = {};
    newTracelinkInfo.rowObject = {
        uid: primaryObject.elementUid || primaryObject.uid
    };
    newTracelinkInfo.colObject = {
        uid: secondaryObject.elementUid || secondaryObject.uid
    };
    newTracelinkInfo.tracelinkDirection = tracelinkDirection;
    linkInfo.primary = primaryObject;
    linkInfo.secondary = secondaryObject;
    if ( tracelinkDirection === 'Defining' ) {
        newTracelinkInfo.definingLinksInfo = [ linkInfo ];
        newTracelinkInfo.complyingLinksInfo = [];
    } else {
        newTracelinkInfo.complyingLinksInfo = [ linkInfo ];
        newTracelinkInfo.definingLinksInfo = [];
    }
    newTracelinkInfo.numOfLinksOnChildren = 1;
    return newTracelinkInfo;
};

/**
 * tracelinkCreated
 * @param {object} data view model
 *  @param {object} ctx context
 */
export let tracelinkCreated = function( data, ctx ) {
    var eventData = data.eventData;
    eventBus.publish( 'Arm0Traceability.unRegisterMatrixCellSelectedCtx' );
    if ( !eventData.startItems || !eventData.endItems || !eventData.relationObjects ) {
        return;
    }

    if ( eventData.startItems.length <= 0 || eventData.endItems.length <= 0 || eventData.relationObjects.length <= 0 ) {
        return;
    }

    var arrPrimaryObjs = eventData.startItems;
    var arrSecObjs = eventData.endItems;
    var arrRelationObjs = eventData.relationObjects;

    var indexRelationObj = 0;

    var arrModelObjs = [];

    // loading properties for both element and revision objects
    //(LCS-315470 - ATDD-The matrix cell having row number "2" and column number "1" should contain "1")
    for ( var i = 0; i < eventData.startItems.length; i++ ) {
        arrModelObjs.push( cdm.getObject( eventData.startItems[ i ].uid ) );
        arrModelObjs.push( reqTraceabilityMatrixService.getRevisionObject( cdm.getObject( eventData.startItems[ i ].uid ) ) );
    }
    for ( i = 0; i < eventData.endItems.length; i++ ) {
        arrModelObjs.push( cdm.getObject( eventData.endItems[ i ].uid ) );
        arrModelObjs.push( reqTraceabilityMatrixService.getRevisionObject( cdm.getObject( eventData.endItems[ i ].uid ) ) );
    }

    var cellProp = [ 'object_string', 'object_name' ];
    requirementsUtils.loadModelObjects( arrModelObjs, cellProp ).then( function() {
        for ( var i = 0; i < arrPrimaryObjs.length; i++ ) {
            var primObj = cdm.getObject( arrPrimaryObjs[ i ].uid );
            for ( var j = 0; j < arrSecObjs.length; j++ ) {
                var relationObj = arrRelationObjs[indexRelationObj];
                if ( relationObj ) {
                    var secObj = cdm.getObject( arrSecObjs[ j ].uid );
                    _cacheNewTracelinkCreated( data, primObj, secObj, relationObj );
                    indexRelationObj += 1;
                }
            }
        }

        // Merge in new links in tree mode, replace old links with new links in list mode
        if ( ctx.MatrixContext && ctx.tlmTreeMode ) {
            cellDataMap = _.merge( getCellMap( data, data.tracelinkInfo ), cellDataMap );
        } else {
            cellDataMap = getCellMap( data, data.tracelinkInfo );
        }
        processData( data, ctx );
    } );
};

/**
 * _resetProductContext
 *
 * @param {Object}
 *            ctx ctx
 */
var _resetProductContext = function( ctx ) {
    _checkMatrixContext( ctx );

    if ( ctx.occmgmtContext ) {
        ctx.MatrixContext.sourcePCI = {
            uid: ctx.occmgmtContext.productContextInfo.uid
        };
        ctx.MatrixContext.targetPCI = {
            uid: ctx.occmgmtContext.productContextInfo.uid
        };
    } else {
        ctx.MatrixContext.sourcePCI = {
            uid: 'AAAAAAAAAAAAAA',
            type: 'unknownType'
        };
        ctx.MatrixContext.targetPCI = {
            uid: 'AAAAAAAAAAAAAA',
            type: 'unknownType'
        };
    }
};

/**
 * Reset tree variables
 *
 * @param {Object} ctx context
 */
var resetTreeStructure = function( ctx ) {
    if ( ctx.MatrixContext.peakSrcInfo ) {
        ctx.sourceObjects = [ ctx.MatrixContext.peakSrcInfo.occurrence ];
        ctx.targetObjects = [ ctx.MatrixContext.peakTargetInfo.occurrence ];
    }

    ctx.MatrixContext.parentRows = null;
    ctx.MatrixContext.expandedRows = [];
    ctx.MatrixContext.parentCols = null;
    ctx.MatrixContext.expandedCols = [];
};

/**
 * Reset Matrix Context : This function will set all button and menu flags to default state amongst other things.
 *
 * @param {Object}
 *            ctx ctx
 */
var resetMatrixContext = function( ctx ) {
    ctx.MatrixContext = {
        sourceObjects: null,
        targetObjects: null,
        pageInfo: {},
        relationType: 'ALL',
        showChildrenTracelinks: false,
        isRunInBackground: false,
        sourcePCI: {
            uid: 'AAAAAAAAAAAAAA',
            type: 'unknownType'
        },
        targetPCI: {
            uid: 'AAAAAAAAAAAAAA',
            type: 'unknownType'
        },
        isMatrixSaved: false,
        sortRow: null,
        sortCol: null
    };

    if ( typeof ctx.tlmTreeMode === 'undefined' ) {
        ctx.tlmTreeMode = true;
    }

    if ( typeof ctx.showTracelinkDirection === 'undefined' ) {
        ctx.showTracelinkDirection = false;
    }

    if ( typeof ctx.showEmpty === 'undefined' ) {
        ctx.showEmpty = true;
    }

    if ( typeof ctx.highlightshowHeatmap === 'undefined' ) {
        ctx.highlightshowHeatmap = false;
    }

    if ( typeof ctx.showObjectName === 'undefined' ) {
        ctx.showObjectName = true;
    }

    if ( typeof ctx.showObjectId === 'undefined' ) {
        ctx.showObjectId = false;
    }

    if ( typeof ctx.showObjectOwner === 'undefined' ) {
        ctx.showObjectOwner = false;
    }

    if ( typeof ctx.showTracelinkCount === 'undefined' ) {
        ctx.showTracelinkCount = true;
    }

    if ( typeof ctx.highlightshow25items === 'undefined' ) {
        ctx.highlightshow25items = true;
    }

    if ( typeof ctx.highlightshow50items === 'undefined' ) {
        ctx.highlightshow50items = false;
    }

    if ( typeof ctx.highlightshow100items === 'undefined' ) {
        ctx.highlightshow100items = false;
    }
};

/**
 * _checkMatrixContext
 *
 * @param {Object}
 *            ctx ctx
 */
var _checkMatrixContext = function( ctx ) {
    if ( !ctx.MatrixContext ) {
        resetMatrixContext( ctx );
    }
};

/**
 * _setMatrixSourceTargetObjects
 *
 * @param {Object}
 *            ctx ctx
 * @param {Object}
 *            sourceObj sourceObj
 * @param {Object}
 *            targetObj targetObj
 */
var _setMatrixSourceTargetObjects = function( ctx, sourceObj, targetObj ) {
    if ( sourceObj ) {
        var sourceObjects = [];
        var tmpSource = {
            uid: sourceObj.uid
        };
        sourceObjects.push( tmpSource );
        ctx.sourceObjects = sourceObjects;
    }
    if ( targetObj ) {
        var targetObjects = [];
        var tmpTarget = {
            uid: targetObj.uid
        };
        targetObjects.push( tmpTarget );
        ctx.targetObjects = targetObjects;
    }
};

/**
 * _loadAndSetSourceTargetObjects
 *
 * @param {Object}
 *            ctx ctx
 * @param {Object}
 *            sourceObj sourceObj
 * @param {Object}
 *            targetObj targetObj
 */
var _loadAndSetSourceTargetObjects = function( ctx, sourceObj, targetObj ) {
    var arrModelObjs = [];
    var deferred = AwPromiseService.instance.defer();
    var cellProp = [ 'awp0CellProperties', 'awb0UnderlyingObject' ];
    if ( sourceObj ) {
        arrModelObjs.push( sourceObj );
    }

    if ( targetObj ) {
        arrModelObjs.push( targetObj );
    }
    requirementsUtils.loadModelObjects( arrModelObjs, cellProp ).then( function() {
        _setMatrixSourceTargetObjects( ctx, cdm.getObject( sourceObj.uid ), cdm.getObject( targetObj.uid ) );
        deferred.resolve();
    } );

    return deferred.promise;
};

/**
 * _setSourceTargetProductContext
 *
 * @param {Object}
 *            ctx ctx
 * @param {Object}
 *            sourcePCI sourcePCI
 * @param {Object}
 *            targetPCI targetPCI
 */
var _setSourceTargetProductContext = function( ctx, sourcePCI, targetPCI ) {
    _checkMatrixContext( ctx );

    if ( sourcePCI ) {
        ctx.MatrixContext.sourcePCI = {
            uid: sourcePCI.uid
        };
    }
    if ( targetPCI ) {
        ctx.MatrixContext.targetPCI = {
            uid: targetPCI.uid
        };
    }
};

/**
 * Capture the user selections for later use.

 *  @param {Object} ctx - The context
 *
 */
export let captureUserSelection = function( ctx ) {
    matrixType = ctx.matrixType;
    sourceObjects2 = ctx.sourceObjects;
    targetObjects2 = ctx.targetObjects;

    if ( !ctx.xrtPageContext || ctx.xrtPageContext.secondaryXrtPageID !== 'arm0TraceabilityMatrix' ) {
        ctx.generateTracebilityMatrixOnReveal = true;
        resetMatrixContext( ctx );
        _resetProductContext( ctx );
    } else {
        eventBus.publish( 'requirementDocumentation.loadMatrixData' );
    }
};

/**
 * prepare the payload for replace matrix operation
 * @param {Boolean} replaceType of radio button if true then replace src else target
 * @param {object} object selected by user in replace panel
 * @param {Object} ctx  
 *
 */
export let generateTraceabilityMatrix = function( replaceType, selectedObject, ctx ) {
    if ( selectedObject ) {
        var input = {
            uid: ''
        };
        var cellProp = [ 'awp0CellProperties', 'awb0UnderlyingObject' ];
        var arrModelObjs = [];
        if ( ctx.targetObjects ) {
            arrModelObjs.push( ctx.targetObjects[0] );
        } else {
            input.uid = _data.targetObjectInfo.occurrence.uid;
            arrModelObjs.push( input );
        }

        if ( ctx.sourceObjects ) {
            arrModelObjs.push( ctx.sourceObjects[0] );
        } else {
            input.uid = _data.srcObjectInfo.occurrence.uid;
            arrModelObjs.push( input );
        }
        if ( ctx.MatrixContext ) {
            ctx.MatrixContext.peakSrcInfo = null;
            ctx.MatrixContext.peakTargetInfo = null;
        }

        requirementsUtils.loadModelObjects( arrModelObjs, cellProp ).then( function() {
            if ( replaceType ) {
                var revObject = reqTraceabilityMatrixService.getRevisionObject( cdm.getObject( arrModelObjs[ 1 ].uid ) );

                var srcObj = {
                    uid: selectedObject.uid
                };

                if ( revObject.uid === selectedObject.uid ) {
                    srcObj.uid = arrModelObjs[1].uid;
                }
                var sourcePCI = {
                    uid: 'AAAAAAAAAAAAAA',
                    type: 'unknownType'
                };
                _setMatrixSourceTargetObjects( ctx, srcObj, arrModelObjs[0] );
                _setSourceTargetProductContext( ctx, sourcePCI );
            } else {
                revObject = reqTraceabilityMatrixService.getRevisionObject( cdm.getObject( arrModelObjs[ 0 ].uid ) );

                var targetObj = {
                    uid: selectedObject.uid
                };

                if ( revObject.uid === selectedObject.uid ) {
                    targetObj.uid = arrModelObjs[0].uid;
                }
                var targetPCI = {
                    uid: 'AAAAAAAAAAAAAA',
                    type: 'unknownType'
                };
                _setMatrixSourceTargetObjects( ctx, arrModelObjs[1], targetObj );
                _setSourceTargetProductContext( ctx, null, targetPCI );
            }
            
            _data.replacePayload = {
                info: "req_replace_matrix_payload2",
                sourceObjects: ctx.sourceObjects[0],
                sourceObjectPCI: ctx.MatrixContext.sourcePCI,
                targetObjects: ctx.targetObjects[0],
                targetObjectPCI: ctx.MatrixContext.targetPCI,
                type: _data.matrixType,
                typelabel: _data.matrixType
            };
            
            eventBus.publish('Arm0TraceabilityMatrix.getFMSFileTicket2');
        } );
    }
};

/**
 * updateFMSFileToReplaceMatrix - during replace operation it is good idea to update the info in the file ticket so that a refresh event will
 * draw the replaced matrix instead of the original matrix that was generated.
 *
 * @param {Object} data - It is the fms ticket that will be used to store the rplaced payload.
 */
var updateFMSFileToReplaceMatrix = function( data ) {
    var form = $( '#fileUploadForm' );
    data.formData = new FormData( $( form )[0] );
    data.formData.append( 'fmsFile', new Blob( [ JSON.stringify( _data.replacePayload ) ], { type: 'text/plain' } ) );
    data.formData.append( 'fmsTicket', data.fmsTicket );
    eventBus.publish( 'Arm0TraceabilityMatrix.uploadFile2' );
    destroyTraceabilityMatrix();
    window.localStorage.setItem( 'serviceDataForTracelinkMatrix', data.fmsTicket );
};

/**
 * Loading saved matrix using a fms ticket. This also used to load Rollup Matrix.
 *
 * @param {Object}
 *            data data
 * @param {Object}
 *            ctx ctx
 * @param {Object}
 *            fmsTicket fmsTicket
 */
var loadTraceabilityMatrix = function( data, ctx, fmsTicket ) {
    if ( fmsTicket ) {
        $.get( exports.getFileUrl( fmsTicket ), function( data1 ) {
            var jsonObject = JSON.parse( data1 );
            data.tracelinkInfo = jsonObject.matrixCellInfo;
            data.rowObjects = jsonObject.rowObjects;
            data.colObjects = jsonObject.colObjects;
            data.srcObjectInfo = jsonObject.srcObjectInfo;
            data.targetObjectInfo = jsonObject.targetObjectInfo;
            data.targetContextInfo = jsonObject.targetContextInfo;
            data.srcContextInfo = jsonObject.srcContextInfo;
            data.targetParentObjectInfo = jsonObject.targetParentObjectInfo;
            data.srcParentObjectInfo = jsonObject.srcParentObjectInfo;
            data.matrixType = jsonObject.matrixType;
            data.isSaved = jsonObject.isSaved;

            ctx.MatrixContext = {
                isMatrixSaved: data.isSaved
            };
            if ( ctx.tlmTreeMode ) {
                resetTreeStructure( ctx );
            }

            if ( data.matrixType === 'Full-Rollup Matrix' ) {
                data.showFullRollupCase = true;
                data.isFullRollUp = true;
            }
            //
            // Quick/Full-Rollup Matrix we one peak src and target as general rule.
            //
            if ( !ctx.sourceObjects && !data.matrixType === 'Dynamic Matrix' ) {
                ctx.sourceObjects = [ { uid: data.srcObjectInfo.occurrence.uid } ];
                ctx.targetObjects = [ { uid: data.targetObjectInfo.occurrence.uid } ];
            }
            exports.processDataFromServer( data, ctx );
        } );
    }
};

/**
 * Prepares the payload to call SOA with Quick Matrix.
 *
 * @param {Object}  matrix_startup_props
 * @param {Object}  ctx
 *
 * @return {Array} input data
 */
var getTraceMatrixInput2 = function( matrix_startup_props, ctx ) {
    var isAsyncCall = false;
    var showChildrenCount = false;
    var itemsPerPage = -1;
    var srcPCI = {};
    var targetPCI = {};
    var matrix = {};
    var sources = [];
    var targets = [];

    sources.push( matrix_startup_props.sourceObjects );
    targets.push( matrix_startup_props.targetObjects );

    if ( matrix_startup_props.sourceObjectPCI ) {
        srcPCI = matrix_startup_props.sourceObjectPCI;
    }

    if ( matrix_startup_props.targetObjectPCI ) {
        targetPCI = matrix_startup_props.targetObjectPCI;
    }

    if ( ctx.tlmTreeMode ) {
        resetTreeStructure( ctx );
    }

    return {
        actionPerformed: 'TRAVERSE_CHILD',
        colPageToNavigate: 1,
        isRunInBackground: false,
        itemsPerPage: -1,
        options: [],
        relationType: 'ALL',
        rowPageTonavigate: 1,
        showChildrenTracelinks: false,
        srcContextInfo: srcPCI,
        sourceObjects: sources,
        targetContextInfo: targetPCI,
        targetObjects: targets,
        traceabilityMatrixObject: matrix
    };
};

/**
 * Prepares the payload to call SOA for dynamic matrix
 *
 * @param {Object}  matrix_startup_props
 * @param {Object}  ctx
 *
 * @return {Array} input data
 */
var getTraceMatrixInput3 = function( matrix_startup_props, ctx ) {
    var isAsyncCall = false;
    var showChildrenCount = false;
    var itemsPerPage = -1;
    var srcPCI = {};
    var targetPCI = {};
    var matrix = { uid: 'AAAAAAAAAAAAAA',
                   type: 'unknownType' };
    var sources = null;
    var targets = [];

    sources = matrix_startup_props.sourceObjects;

    if ( matrix_startup_props.sourceObjectPCI ) {
        srcPCI = matrix_startup_props.sourceObjectPCI;
    }

    if ( matrix_startup_props.targetObjectPCI ) {
        targetPCI = matrix_startup_props.targetObjectPCI;
    }

    return {
        actionPerformed: 'TRAVERSE_CHILD',
        colPageToNavigate: 1,
        isRunInBackground: false,
        itemsPerPage: -1,
        options: [],
        relationType: 'ALL',
        rowPageTonavigate: 1,
        showChildrenTracelinks: false,
        srcContextInfo: srcPCI,
        sourceObjects: sources,
        targetContextInfo: targetPCI,
        targetObjects: targets,
        traceabilityMatrixObject: matrix
    };
};

/**
 * Uses the req_generate_matrix_payload2 session data to call SOA.
 *
 * @param {object} data Input data
 * @param {Object} ctx - The context
 */
var getTraceabilityMatrix2 = function( data, ctx, payLoad ) {
    if ( payLoad ) {
        if( payLoad.info === 'req_dynamic_matrix_payload2' ) {
            data.matrixType = payLoad.type;
            var soaInput = {
                    inputData: getTraceMatrixInput3( payLoad, ctx )
            };

            soaSvc.postUnchecked( 'Internal-AwReqMgmtSe-2018-12-SpecNavigation', 'getTraceabilityMatrix', soaInput )
            .then(
                function( payDump ) {
                    data.tracelinkInfo = payDump.matrixCellInfo;
                    data.rowObjects = payDump.rowObjects;
                    data.colObjects = payDump.colObjects;
                    data.srcObjectInfo = payDump.srcObjectInfo;
                    data.targetObjectInfo = payDump.targetObjectInfo;
                    data.targetContextInfo = payDump.targetContextInfo;
                    data.srcContextInfo = payDump.srcContextInfo;
                    data.targetParentObjectInfo = payDump.targetParentObjectInfo;
                    data.srcParentObjectInfo = payDump.srcParentObjectInfo;
                    data.isSaved = payDump.isSaved;
                    data.ServiceData = payDump.ServiceData;
                    data.traceabilityMatrixObject = payDump.traceabilityMatrixObject;

                ctx.MatrixContext = {
                    isMatrixSaved: data.isSaved
                };
                if ( ctx.tlmTreeMode ) {
                    resetTreeStructure( ctx );
                }

                if ( data.matrixType === 'Full-Rollup Matrix' ) {
                    data.showFullRollupCase = true;
                    data.isFullRollUp = true;
                }

                if ( !ctx.sourceObjects && !data.matrixType === 'Dynamic Matrix' ) {
                    ctx.sourceObjects = [ { uid: data.srcObjectInfo.occurrence.uid } ];
                    ctx.targetObjects = [ { uid: data.targetObjectInfo.occurrence.uid } ];
                }

                processDataFromServer( data, ctx );
            } ); 
        } else {
            data.matrixType = payLoad.type;

            var soaInput = {
                inputData: getTraceMatrixInput2( payLoad, ctx )
            };

            soaSvc.postUnchecked( 'Internal-AwReqMgmtSe-2018-12-SpecNavigation', 'getTraceabilityMatrix', soaInput )
            .then(
                function( payDump ) {
                    data.tracelinkInfo = payDump.matrixCellInfo;
                    data.rowObjects = payDump.rowObjects;
                    data.colObjects = payDump.colObjects;
                    data.srcObjectInfo = payDump.srcObjectInfo;
                    data.targetObjectInfo = payDump.targetObjectInfo;
                    data.targetContextInfo = payDump.targetContextInfo;
                    data.srcContextInfo = payDump.srcContextInfo;
                    data.targetParentObjectInfo = payDump.targetParentObjectInfo;
                    data.srcParentObjectInfo = payDump.srcParentObjectInfo;
                    data.isSaved = payDump.isSaved;
                    data.ServiceData = payDump.ServiceData;
                    data.traceabilityMatrixObject = payDump.traceabilityMatrixObject;

                ctx.MatrixContext = {
                    isMatrixSaved: data.isSaved
                };
                if ( ctx.tlmTreeMode ) {
                    resetTreeStructure( ctx );
                }

                if ( data.matrixType === 'Full-Rollup Matrix' ) {
                    data.showFullRollupCase = true;
                    data.isFullRollUp = true;
                }

                if ( !ctx.sourceObjects && !data.matrixType === 'Dynamic Matrix' ) {
                    ctx.sourceObjects = [ { uid: data.srcObjectInfo.occurrence.uid } ];
                    ctx.targetObjects = [ { uid: data.targetObjectInfo.occurrence.uid } ];
                }

                processDataFromServer( data, ctx );
            } );
        }
    }
};

eventBus.subscribe( 'Arm0Traceability.applyMatrixSettings', function( event ) {
    processData( null, event );
} );

/**
 * Initialize matrix controls
 *
 * @param {object} data Input data
 * @param {Object} ctx - The context
 */
export let init = function( data, ctx ) {
    var serviceDataFileTicket = window.localStorage.getItem( 'serviceDataForTracelinkMatrix' );
    var sessionStorageValue = window.sessionStorage.getItem( 'serviceDataForTracelinkMatrix' );

    resetMatrixContext( ctx );
    resetTreeStructure( ctx );

    if( data === null ) {
        data = _data;
    }

    if( !sessionStorageValue || sessionStorageValue === 'null' ) {
        if( serviceDataFileTicket ) {
        $.get( exports.getFileUrl( serviceDataFileTicket ), function( payLoad ) {
                /*
                * Important: When the matrix gets created for the first time by the generate panel
                * data that is needed to populate matrix comes with this payLoad.
                * It will be stored in the session so that refresh can access the payLoad later.
                * Also, in this cases the payLoad is the SOA response and it includes the service data.
                */
                window.sessionStorage.setItem( 'req_generate_matrix_payload2', payLoad );
                getTraceabilityMatrix2( data, ctx, JSON.parse( payLoad ) );
            } );
        }
        if ( serviceDataFileTicket ) {
        window.sessionStorage.setItem( 'serviceDataForTracelinkMatrix', serviceDataFileTicket );
        window.localStorage.removeItem( 'serviceDataForTracelinkMatrix' );
        }
    }

    var sessionPayLoad = window.sessionStorage.getItem( 'req_generate_matrix_payload2' );
    if( sessionPayLoad ) {
        /*
        * Important: sessionPayLoad will not be available the first run, but it will be available afterwards.
        * This payLoad will be used to call SOA and get the latest data from server.
        */
        getTraceabilityMatrix2( data, ctx, JSON.parse( sessionPayLoad ) );
    }
    


    var fileTicketFullRollup = localStorage.get( 'TraceabilityMatrixJsonFileFMSTicket' );
    var fileTicketFullRollupSessionStorageValue = window.sessionStorage.getItem( 'TraceabilityMatrixJsonFileFMSTicket' );
    if ( fileTicketFullRollup || fileTicketFullRollupSessionStorageValue ) {
        if( !fileTicketFullRollup ) {
            fileTicketFullRollup = fileTicketFullRollupSessionStorageValue;
        }

        data.showFullRollupCase = true;
        loadTraceabilityMatrix( data, ctx, fileTicketFullRollup );
        /*
        * Important: store full roll up file ticket in session in case the user decides to refresh the window.
        */
        window.sessionStorage.setItem( 'TraceabilityMatrixJsonFileFMSTicket', fileTicketFullRollup );
        localStorage.removeItem( 'TraceabilityMatrixJsonFileFMSTicket' );
    }
    
    /*
    * Important: for saved matrix first get ticket using selected uid then load matrix
    */
    if( serviceDataFileTicket === null && sessionStorageValue === null && sessionPayLoad === null && fileTicketFullRollup === null && fileTicketFullRollupSessionStorageValue === null ) {
        requirementsUtils.getTraceabilityMatrixFMSTicket( ctx.selected ).then( function( fmsTicket ) {
            loadTraceabilityMatrix( data, ctx, fmsTicket );
        } );
    }

    if( data.noOfPageListIn ) {
        data.noOfPageList = listBoxService.createListModelObjectsFromStrings( data.noOfPageListIn.dbValue );
    }
    _data = data;
};

/**
 * getFileUrl
 *
 * @param {Object}
 *            ticket fms ticket id
 *
 * @return {String} fms file url
 */
export let getFileUrl = function( ticket ) {
    var filepath = 'fms/fmsdownload/?ticket=' + ticket;
    return filepath;
};

/**
 * event habdler to open replace panel
 */
export let openReplacePanel = function() {
    commandPanelService.activateCommandPanel( 'Arm0ReplacePanel', 'aw_toolsAndInfo', null );
};

/**
 * the traceability matrix will be set to its original state
 * @param {object} data Input data
 */
export let resetTraceMatrix = function( data ) {
    _data.colObjects = _.cloneDeep( _data.clonedColObjects );
    _data.rowObjects = _.cloneDeep( _data.clonedRowObjects );
    var ctx = appCtxService.ctx;
    resetMatrixContext(ctx);
    init( null, ctx );
};

/**
 * rollupClicked
 * @param {Object}
 *            ctx The context
 * @param {Object}
 *            data event data
 */
export let rollupClicked = function( ctx, data ) {
    data.isFullRollUp = true;
    data.showChildrenTracelinks = true;
    eventBus.publish( 'requirementTraceabilityMatrix.getChildRollup' );
};

/**
 * Create input for getInterfaces SOA
 *
 * @param {Object}
 *            ctx The context
 * @param {Object}
 *            data event data
 *
 * @return {Array} input data for get interfaces
 */
export let getChildMatrixInput = function( ctx, data ) {
    var matrixObj = 'AAAAAAAAAAAAAA';
    var isRunInBackground = data.isFullRollUp || false;
    if ( data.showFullRollupCase ) {
        data.showChildrenTracelinks = data.showFullRollupCase;
        matrixObj = ctx.selected.uid;
        isRunInBackground = false;
    }
    var actionPerformed = 'TRAVERSE_CHILD';
    var srcPCI = ctx.MatrixContext.sourcePCI;
    var targetPCI = ctx.MatrixContext.targetPCI;

    // different from source
    var itemsPerPage = parseInt( data.noOfItem.dbValue );

    var sourceObjects = [];
    var targetObjects = [];

    // determine source and target structures
    if ( data.eventData && data.eventData.rowUid ) {
        var source = {
            uid: data.eventData.rowUid
        };
        sourceObjects.push( source );
        if ( data.eventData.rowUid === '-1' ) {
            sourceObjects = ctx.sourceObjects;
        }
        // in tree mode need to pass all expand rows
        if ( ctx.tlmTreeMode ) {
            ctx.MatrixContext.parentRows = data.rowObjects;
            ctx.MatrixContext.parentCols = data.colObjects;
            parentRowUid = data.eventData.rowUid;
            ctx.MatrixContext.expandedRows.push( parentRowUid );
        }
    } else {
        if ( ctx.tlmTreeMode ) {
            sourceObjects.push( { uid: ctx.MatrixContext.peakSrcInfo.occurrence.uid } );
            ctx.MatrixContext.expandedRows.forEach( function( uid ) {
                sourceObjects.push( { uid: uid } );
            } );
        } else {
            sourceObjects = ctx.sourceObjects;
        }
    }

    if ( data.eventData && data.eventData.colUid ) {
        var target = {
            uid: data.eventData.colUid
        };
        targetObjects.push( target );
        if ( data.eventData.colUid === '-1' ) {
            targetObjects = ctx.targetObjects;
        }
        // in tree mode need to pass all expand columns
        if ( ctx.tlmTreeMode ) {
            ctx.MatrixContext.parentCols = data.colObjects;
            ctx.MatrixContext.parentRows = data.rowObjects;
            parentColUid = data.eventData.colUid;
            ctx.MatrixContext.expandedCols.push( parentColUid );
        }
    } else {
        if ( ctx.tlmTreeMode ) {
            targetObjects.push( { uid: ctx.MatrixContext.peakTargetInfo.occurrence.uid } );
            ctx.MatrixContext.expandedCols.forEach( function( uid ) {
                targetObjects.push( { uid: uid } );
            } );
        } else {
            targetObjects = ctx.targetObjects;
        }
    }

    if ( data.eventData ) {
        reqTraceabilityMatrixService.setPageInfo( data, data.eventData.colPageToNavigate, data.eventData.rowPageToNavigate, undefined, undefined,
            data.eventData.displayRowFrom, data.eventData.displayColFrom );
    }

    ctx.targetObjects = targetObjects;
    ctx.sourceObjects = sourceObjects;

    var needAllData = ctx.tlmTreeMode || showEmptyRowsandColsActionState || ctx.MatrixContext.sortRow || ctx.MatrixContext.sortCol;
    var inputData = {
        sourceObjects: sourceObjects,
        targetObjects: targetObjects,
        relationType: 'ALL',
        actionPerformed: actionPerformed,
        srcContextInfo: srcPCI,
        targetContextInfo: targetPCI,
        itemsPerPage: needAllData ? -1 :  itemsPerPage,
        traceabilityMatrixObject: { uid: matrixObj },
        rowPageTonavigate: data.pageInfo.rowPageToNavigate,
        colPageToNavigate: data.pageInfo.colPageToNavigate,
        showChildrenTracelinks: data.showChildrenTracelinks || false,
        isRunInBackground: isRunInBackground,
        options: []
    };
    data.isFullRollUp = false;
    data.showChildrenTracelinks = false;
    haveFullData = needAllData;
    return inputData;
};

/**
 * Create input for getInterfaces SOA
 *
 * @param {Object}
 *            ctx The context
 * @param {Object}
 *            data event data
 *
 * @return {Array} input data for get interfaces
 */
export let getTraceMatrixInput = function( ctx, data ) {
    var isAsyncCall = false;
    var showChildrenCount = false;
    var itemsPerPage = 25;

    var actionPerformed = 'TRAVERSE_CHILD';
    var srcPCI = {};
    var targetPCI = {};

    if ( data ) {
        showChildrenCount = data.showChildCounts.dbValue;
        itemsPerPage = parseInt( data.noOfItem.dbValue ) || 25;
    }

    if ( ctx.MatrixContext ) {
        srcPCI = ctx.MatrixContext.sourcePCI;
        targetPCI = ctx.MatrixContext.targetPCI;
        if ( ctx.tlmTreeMode ) {
            resetTreeStructure( ctx );
        }
    }

    // For tree mode or removing empty all trace link info is needed, not just one page
    var needAllData = ctx.tlmTreeMode || !showEmptyRowsandColsActionState || ctx.MatrixContext.sortRow || ctx.MatrixContext.sortCol;

    var inputData = {
        sourceObjects: ctx.sourceObjects,
        targetObjects: ctx.targetObjects,
        relationType: 'ALL',
        actionPerformed: actionPerformed,
        srcContextInfo: srcPCI,
        targetContextInfo: targetPCI,
        itemsPerPage: needAllData ? -1 :  itemsPerPage,
        rowPageTonavigate: 1,
        colPageToNavigate: 1,
        showChildrenTracelinks: showChildrenCount,
        isRunInBackground: isAsyncCall,
        options: []
    };
    haveFullData = needAllData;
    return inputData;
};

/**
 * Sets page size of the traceability Matrix
 * @param {object} data Input data
 * @param {object} ctx context
 */
export let setPageSize = function( data, ctx ) {
    if ( _data.noOfItem.dbValue ) {
        _page_size = data;
        _data.noOfItem.dbValue = _page_size;

        if ( _page_size === 25 ) {
            ctx.highlightshow25items = true;
            ctx.highlightshow50items = false;
            ctx.highlightshow100items = false;
        } else if ( _page_size === 50 ) {
            ctx.highlightshow25items = false;
            ctx.highlightshow50items = true;
            ctx.highlightshow100items = false;
        } else if ( _page_size === 100 ) {
            ctx.highlightshow25items = false;
            ctx.highlightshow50items = false;
            ctx.highlightshow100items = true;
        }
    }
    processData( _data, ctx );
};

/**
 * toggleHeatMap
 *
 * Note: Do not want tracelink arrows if heatmap is on. if heatmap is on, then arrows check box will be false and disabled.
 *
 * @param {object} data Input data
 * @param {object} ctx Input ctx
 */
export let toggleHeatMap = function( data, ctx ) {
    if ( data === 'heat' ) {
        ctx.highlightshowHeatmap = true;
        ctx.showTracelinkCount = !ctx.highlightshowHeatmap;

        var eventData = {
            showHeatmap: ctx.highlightshowHeatmap,
            showTracelinkCount: ctx.showTracelinkCount,
            showTracelinkDirection: ctx.showTracelinkDirection,
            matrixMode: ctx.tlmTreeMode
        };

        reqTraceabilityMatrixService.refreshMatrix( eventData );
    } else {
        ctx.highlightshowHeatmap = false;
        ctx.showTracelinkCount = !ctx.highlightshowHeatmap;

        var eventData = {
            showHeatmap: ctx.highlightshowHeatmap,
            showTracelinkCount: ctx.showTracelinkCount,
            showTracelinkDirection: ctx.showTracelinkDirection,
            matrixMode: ctx.tlmTreeMode
        };
        reqTraceabilityMatrixService.refreshMatrix( eventData );
    }
};

/**
 * handle the state of the matrix view
 *
 * Note: toggling the state of the matrix will cause a full reset & redraw.
 *
 * @param {object} data Input data
 * @param {object} ctx Input ctx
 */
export let toggleTlmView = function( data, ctx ) {
    if ( data === 'list' ) {
        ctx.tlmTreeMode = false;
    } else {
        ctx.tlmTreeMode = true;
    }
    init( null, ctx );
};

/**
 * set no of items in a page to display
 * @param {Object}
 *            data - The panel's view model object
 */
export let getNoOfItemsPerPage = function( data ) {
    if ( data.tracelinkInfo ) {
        if ( data.showFullRollupCase || matrixType === 'Dynamic Matrix' ) {
            var page_size = parseInt( data.noOfItem.dbValue );
            var total_rows = data.rowObjects.length;
            var total_cols = data.colObjects.length;
            var totalRowPages = Math.ceil( total_rows / page_size );
            var totalColumnPages = Math.ceil( total_cols / page_size );

            reqTraceabilityMatrixService.setPageInfo( data, 1, 1, totalColumnPages, totalRowPages, 1, 1 );
            var ctx = appCtxService.ctx;
            processData( data, ctx );
        } else {
            reqTraceabilityMatrixService.resetPageInfo( data );
            eventBus.publish( 'requirementDocumentation.loadMatrixData' );
        }
    }
};

/**  
 * if user is in full Roll up, he cannot Navigate up and Down
 * @param {Object}
 *            data - The panel's view model object
 * @param {Object}
 *            ctx - The context
 */
export let isNavigationRequired = function( data, ctx ) {
    resetFullDataCache( ctx );
    eventBus.publish( 'requirementDocumentation.navigate', data.eventMap['requirementTraceability.navigateUpOrDown'] );
};

/** */
/**
 * collapse specified node
 * @param {Object} data - The panel's view model object
 * @param {Object} ctx context
 */
export let collapseNode = function( data, ctx ) {
    var rowUid = data.eventMap[ 'Arm0TraceabilityMatrix.collapseNode' ].rowUid;
    var colUid = data.eventMap[ 'Arm0TraceabilityMatrix.collapseNode' ].colUid;
    if ( rowUid && ctx.MatrixContext.expandedRows.indexOf( rowUid ) !== -1 ) {
        var newRows = [];
        var collapseRows = [ rowUid ];
        data.rowObjects.forEach( function( obj ) {
            if ( collapseRows.includes( obj.parentUid ) ) {
                if ( obj.isExpanded ) {
                    collapseRows.push( obj.occurrence.uid );
                }
            } else {
                newRows.push( obj );
            }
            if ( obj.occurrence.uid === rowUid ) {
                obj.isExpanded = false;
            }
        } );
        data.rowObjects = newRows;
        ctx.MatrixContext.expandedRows = ctx.MatrixContext.expandedRows.filter( uid => uid !== rowUid );
    }

    if ( colUid && ctx.MatrixContext.expandedCols.indexOf( colUid ) !== -1 ) {
        var newCols = [];
        var collapseCols = [ colUid ];
        data.colObjects.forEach( function( obj ) {
            if ( collapseCols.includes( obj.parentUid ) ) {
                if ( obj.isExpanded ) {
                    collapseCols.push( obj.occurrence.uid );
                }
            } else {
                newCols.push( obj );
            }
            if ( obj.occurrence.uid === colUid ) {
                obj.isExpanded = false;
            }
        } );
        data.colObjects = newCols;
        ctx.MatrixContext.expandedCols = ctx.MatrixContext.expandedCols.filter( uid => uid !== colUid );
    }
    processData( data, ctx );
};

/**
 *  if user is in full Roll up, he cannot Navigate up and Down
 * @param {Object}
 *            data - The panel's view model object
 * @param {Object}
 *            ctx - The context
 */
export let isSoapaginationRequired = function( data ) {
    if ( !data.isFullRollUp && data.matrixType !== 'Dynamic Matrix' ) {
        eventBus.publish( 'requirementDocumentation.navigate', data.eventMap['requirementTraceability.uiPagination'] );
    } else {
        reqTraceabilityMatrixService.setPageInfo( data, data.eventData.colPageToNavigate, data.eventData.rowPageToNavigate, null, null, data.eventData.displayRowFrom, data.eventData.displayColFrom );
        var ctx = appCtxService.ctx;
        processData( data, ctx );
    }
};

/**
 * Filter links based on link type.
 * @param {Object}
 *            data event data
 * @param {Object}
 *            ctx - The context
 */
export let getSelectedTypeOfTraceLink = function( data, ctx ) {
    if ( !data.eventData.selectedObjects[0] ) {
        return;
    }
    eventBus.publish( 'Arm0TraceabilityMatrix.saveScroll' );
    data.tlType = data.eventData.selectedObjects[0];
    data.tlType.dbValue = data.tlType.propInternalValue;
    _data.tlType = data.tlType;
    if ( _data.tracelinkInfo ) {
        processData( _data, ctx );
    }
    ctx.selected = ctx.MatrixContext.matrixObj;
    ctx.mselected[0] = ctx.MatrixContext.matrixObj;

    eventBus.publish( 'Arm0TracelinkMatrix.closeFunnelPopup' );
};

/**
 * pagination event for tracelink
 * @param {Object}
 *            data event data
 * @param {Object}
 *            ctx - The context
 */
export let performPagination = function( data, ctx ) {
    processData( data, ctx );
};

/**
 * event handler to open Trace link matrix object panel
 */
export let openCloseSaveTracelinkMatrixObjectPanel = function() {
    commandPanelService.activateCommandPanel( 'Arm0SaveTraceabilityMatrix', 'aw_toolsAndInfo', null );
};

/**
 * event handler to open Trace link matrix settings panel
 */
export let openArm0TraceabilityMatrixSettings = function( ctx ) {
    var ctx = appCtxService.ctx;

    commandPanelService.activateCommandPanel( 'Arm0TraceabilityMatrixSettings', 'aw_toolsAndInfo', ctx );
};

/**
 * event handler to save updated trace link matrix object
 */
export let refreshTracelinkMatrixObject = function() {
    eventBus.publish( 'Arm0TracelinkMatrixObject.saveTraceabilityMatrix' );
};

/**
 * To show updated traceabilty matrix
 *
 * @param {Object} ctx - The context
 * @param {Object} data - The panel's view model object
 */
export let showUpdatedTLMatrix = function( ctx, data ) {
    _data.isSaved = true;

    if ( data && data.updatedTlMatrixObjectUids && data.updatedTlMatrixObjectUids.length > 0 ) {
        var updateTlMatrixObjectUid = data.updatedTlMatrixObjectUids[0];
        var updateTlMatrixObject = cdm.getObject( updateTlMatrixObjectUid );
        requirementsUtils.getTraceabilityMatrixFMSTicket( updateTlMatrixObject ).then( function( fmsTicket ) {
            loadTraceabilityMatrix( data, ctx, fmsTicket );
        } );
    }
};

/**
 * This function will load the properties of tracelink matrix object if necessary
 */
export let loadTMOproperties = function() {
    var arrModelObjs = [];
    var cellProp = [];
    var selectedObj = appCtxService.ctx.mselected[ 0 ];
    if ( selectedObj.uid ) {
        var selectedObjectRevision = reqTraceabilityMatrixService.getRevisionObject( cdm.getObject( selectedObj.uid ) );
        if ( selectedObjectRevision && selectedObjectRevision.props && !selectedObjectRevision.props.last_mod_date ) {
            var tlMatrixObject = { uid: selectedObjectRevision.uid };
            arrModelObjs.push( tlMatrixObject );
            cellProp.push( 'last_mod_date' );
        }
    }
    if ( arrModelObjs.length > 0 && cellProp.length > 0 ) {
        requirementsUtils.loadModelObjects( arrModelObjs, cellProp ).then( function() {} );
    }
};

/**
 * This function will return the Soa Input for saveViewModelEditAndSubmitWorkflow2
 * @param {Object} data event data
 * @return {object} soaInput input for the soa call
 */
export let buildInputForSaveEditingTMO = function( data ) {
    var inputs = [];
    var modifiedProperties = [];
    var selectedObj = appCtxService.ctx.mselected[ 0 ];
    var selectedObjectRevision = reqTraceabilityMatrixService.getRevisionObject( cdm.getObject( selectedObj.uid ) );

    var obj = {
        uid: selectedObjectRevision.uid,
        type: selectedObjectRevision.type
    };
    var modifiedProperty = {
        propertyName: 'object_name',
        dbValues: [ data.name.dbValue ],
        uiValues: [ data.name.uiValue ],
        intermediateObjectUids: [],
        srcObjLsd: selectedObjectRevision.props.last_mod_date.dbValues[0],
        isModifiable: true
    };

    modifiedProperties.push( modifiedProperty );
    var input = {
        obj: obj,
        viewModelProperties: modifiedProperties,
        isPessimisticLock: false,
        workflowData: {}
    };
    inputs.push( input );
    return inputs;
};

/**
 * This function will return the Soa Input for saveTraceabilityMatrix
 * @return {object} inputData input for the soa call
 */
export let getTraceMatrixInputForSave = function() {
    var tracelinkInput;
    var ctx = appCtxService.ctx;

    if ( _data.matrixType === 'Full-Rollup Matrix' ) {
        tracelinkInput = exports.getChildMatrixInput( ctx, _data );
        tracelinkInput.isRunInBackground = true;
    } else {
        tracelinkInput = exports.getTraceMatrixInput( ctx, _data );
    }
    tracelinkInput.traceabilityMatrixObject = { uid: ctx.selected.uid };

    var operation;
    
    if ( _data.isSaved ) {
        operation = 'refresh';
        _data.isSaved = true;
    } else {
        operation = 'save';
        _data.isSaved = false;
    }
    
    if( _data.matrixType === 'Dynamic Matrix' && !_data.isSaved ) {
        tracelinkInput.sourceObjects = [ { uid: _data.rowObjects[0].occurrence.uid } ];
        tracelinkInput.targetObjects = [ { uid: _data.rowObjects[0].occurrence.uid } ];
    } else if( _data.matrixType === 'Dynamic Matrix' && _data.isSaved ) {
        var objects = [];
        for( var i = 0; i < _data.rowObjects.length; i++ ) {
            objects.push( { uid: _data.rowObjects[i].occurrence.uid } );
        }
        tracelinkInput.sourceObjects = objects;
        tracelinkInput.targetObjects = [];
    }

    return {
        tracelinkInput: tracelinkInput,
        matrixType: _data.matrixType,
        targetFolder: { uid: 'AAAAAAAAAAAAAA' },
        operation: operation
    };
};

/**
 * Update the sort information for traceablity matrix
 *
 * @param {DeclViewModel} data - The declViewModel data context object.
 */
export let sortTraceabilityMatrix = function( data, ctx ) {
    if ( data.eventData.sortCol ) {
        ctx.MatrixContext.sortCol = data.eventData.sortCol;
    }
    if ( data.eventData.sortRow ) {
        ctx.MatrixContext.sortRow = data.eventData.sortRow;
    }
    if ( haveFullData ) {
        eventBus.publish( 'requirementDocumentation.processDataFromServer' );
    } else {
        refreshTraceabilityMatrix();
    }
};

/**
 * Update the showEmptyRowsandColsAction and persist it's state
 *
 * @param {DeclViewModel} data - The declViewModel data context object.
 */
export let showEmptyRowsAndColsAction = function( data, ctx ) {
    showEmptyRowsandColsActionState = !showEmptyRowsandColsActionState;
    ctx.showEmpty = showEmptyRowsandColsActionState;
    reqTraceabilityMatrixService.resetPageInfo( _data );
    // Important: "haveFullData" is related to having all data from all pages.
    // useCachedData: is set to true to restore the empties that were removed. 
    if ( haveFullData ) {
        if ( showEmptyRowsandColsActionState ) {
            // restore empty rows and columns that were filtered out
            useCachedData = true;
        }
        eventBus.publish( 'requirementDocumentation.processDataFromServer' );
    } else {
        if ( showEmptyRowsandColsActionState ) {
            useCachedData = true;
        }
        eventBus.publish( 'requirementDocumentation.processDataFromServer' );
    }
};

/**
 * Update the showEmptyRowsandColsAction and persist it's state
 * @param {Boolean} showTracelinkDirection - The boolean to decide whether to show tracelink direction
 */
export let tracelinkDirectionChangeAction = function( showTracelinkDirection ) { // eslint-disable-line no-unused-vars
    reqTraceabilityMatrixService.tracelinkDirectionChangeAction( showTracelinkDirection );
};

/**
 * Set display name for given object
 * @param {object} obj Row or column object
 * @param {object} ctx Context with settings info
 */
var updateDisplayName = function( obj, ctx ) {
    var selected_labels = [];
    obj.displayName = '';

    //Note: If the check box are initialized programatically the show up as booleans, but
    //the the checkboxes are modified via the widget they show up as strings.
    if( !ctx.showObjectId || ctx.showObjectId === 'false' ) {
        obj.displayName = String( obj.displayName );
    } else {
        selected_labels.push( obj.id );
    }
    
    if( !ctx.showObjectName || ctx.showObjectName === 'false' ) {
        obj.displayName = String( obj.displayName );
    } else {
        selected_labels.push( obj.name );
    }

    if( !ctx.showObjectOwner || ctx.showObjectOwner === 'false' ) {
        obj.displayName = String( obj.displayName );
    } else {
        selected_labels.push( obj.owner );
    }

    //display name by default if nothing was selected.
    if(
        ( !ctx.showObjectId || ctx.showObjectId === 'false' ) &&
        ( !ctx.showObjectName || ctx.showObjectName === 'false' ) &&
        ( !ctx.showObjectOwner || ctx.showObjectOwner === 'false' )  ) {
        ctx.showObjectName = true;
        obj.displayName += obj.name;
    } else {
        for ( var ii = 0; ii < selected_labels.length; ii++ ) {
          if( ii === 0 ) {
            obj.displayName += selected_labels[ii];
          }
          if( ii > 0 ) {
            obj.displayName += ' - ' + selected_labels[ii];
          }
        }
    }
};

/**
 * Update values
 * Also, DO NOT allow labels array to reach zero because cluster will look bad.
 *
 * @param {DeclViewModel} data - The declViewModel data context object.
 */
export let updateValues = function( data ) { // eslint-disable-line no-unused-vars
    var eventData = '';

    if( data.dbValue ) {
        var eventData = {
            label_state: true,
            label_display: data.uiValues[0]
        };
    } else {
        var eventData = {
            label_state: false,
            label_display: data.uiValues[0]
        };
    }
    eventBus.publish( 'Arm0TraceabilityMatrix.updateLabelValues', eventData );
};

/*
 * Determines if give links should be displayed based on link type filter.
 * @param {object} linkInfo Matrix cell info
 * @param {*} filterLinkType Trace link type name to filter on or ALL
 * @return {boolean} return true or false
 */
var isFilteredByType = function( linkInfo, filterLinkType ) {
    if ( filterLinkType === 'ALL' ) {
        return true;
    }
    var isFiltered = false;
    var allLinksArray = linkInfo.complyingLinksInfo.concat( linkInfo.definingLinksInfo );
    // TODO if any link is filter out then all links for this cell are filtered out
    var count = 0;
    for ( var index = 0; index < allLinksArray.length; index++ ) {
        if ( allLinksArray[index].tracelinkType === filterLinkType ) {
            count += 1;
            isFiltered = true;
        }
    }
    linkInfo.numOfLinksOnChildren = count;
    return isFiltered;
};

/**
 * Process data Object for the tracelink generation
 * @param {object} data Data for rows, columns and link
 * @param {boolean} treeMode True if in tree mode
 */
var processData = function( data, ctx ) {
    if( data && ctx ) {
        var networkData = _makeDataCompliant( data, cellDataMap );

        ctx.showTracelinkCount = !ctx.highlightshowHeatmap;

        var eventData = {
            networkData: networkData,
            showHeatmap: ctx.highlightshowHeatmap,
            showTracelinkDirection : ctx.showTracelinkDirection,
            titleRowColumn: stuffLabelData( data, ctx ),
            targetParentObjectInfo: data.targetParentObjectInfo,
            srcParentObjectInfo: data.srcParentObjectInfo,
            pageInfo: data.pageInfo,
            showFullRollUpCase: data.showFullRollupCase === true ? data.showFullRollupCase : data.showChildCounts.dbValue,
            matrixMode: ctx.tlmTreeMode
        };

        eventBus.publish( 'Arm0TraceabilityMatrix.refresh', eventData );
        reqTraceabilityMatrixService.refreshMatrix( eventData );
    } else {
        //use _data
        applyServiceData( _data );
        var networkData = _makeDataCompliant( _data, cellDataMap );
        
        var eventData = {
            networkData: networkData,
            showHeatmap: ctx.highlightshowHeatmap,
            showTracelinkDirection : ctx.showTracelinkDirection,
            titleRowColumn: stuffLabelData( _data, ctx ),
            targetParentObjectInfo: _data.targetParentObjectInfo,
            srcParentObjectInfo: _data.srcParentObjectInfo,
            pageInfo: _data.pageInfo,
            showFullRollUpCase: _data.showFullRollupCase === true ? _data.showFullRollupCase : _data.showChildCounts.dbValue,
            matrixMode: ctx.tlmTreeMode
        };

        eventBus.publish( 'Arm0TraceabilityMatrix.refresh', eventData );
        reqTraceabilityMatrixService.refreshMatrix( eventData );
    }
};

/**
 * Set the indentation level for a row or column object
 * @param {object} node The row or column object
 * @param {object[]} parents Map of parent objects in tree
 */
var setLevel = function( node, parents ) {
    if ( node.isParent ) {
        parents.set( node.occurrence.uid, node );
    }
    var parent = parents.get( node.parentUid );
    node.level = parent ? parent.level + 1 : 0;
};


/**
 * Convert data to input for heat Map
 * @param {object} data Data for rows, columns and links
 * @param {object} linkMap Map to get link info give source and target uid
 * @param {object} treeMode True if in tree mode
 * @return {Object} cellData of a grid
 */
var _makeDataCompliant = function( data, linkMap ) {
    var row_nodes = [];
    var col_nodes = [];
    var links = [];
    var transformedData = {
        row_nodes: [],
        links: [],
        col_nodes: []
    };

    if ( data.length <= 0 ) {
        return transformedData;
    }

    if ( data.noOfItem === null ) {
        data.noOfItem = _data.noOfItem;
    }

    if ( data.noOfItem.dbValue === null ) {
        data.noOfItem.dbValue = _page_size;
    }

    var page_size = parseInt( data.noOfItem.dbValue );

    if ( !page_size ) {
        data.noOfItem.dbValue = _page_size;
        page_size = data.noOfItem.dbValue;
    }

    var ctx = appCtxService.ctx;
    var total_rows = data.rowObjects.length;
    var total_cols = data.colObjects.length;

    var colPageToNavigate = data.pageInfo.colPageToNavigate;
    var rowPageToNavigate = data.pageInfo.rowPageToNavigate;

    var startIndexRowItems = ctx.tlmTreeMode ? 0 :  rowPageToNavigate - 1;
    var startIndexColItems = ctx.tlmTreeMode ? 0 :  colPageToNavigate - 1;

    var totalRowPages = Math.ceil( total_rows / page_size );
    var totalColumnPages = Math.ceil( total_cols / page_size );


    if ( colPageToNavigate > totalColumnPages ) {
        colPageToNavigate = totalColumnPages;
    }

    if ( rowPageToNavigate > totalRowPages ) {
        rowPageToNavigate = totalRowPages;
    }

    reqTraceabilityMatrixService.setPageInfo( data, colPageToNavigate, rowPageToNavigate, totalColumnPages, totalRowPages, data.pageInfo.displayRowFrom, data.pageInfo.displayColFrom );
    var startIndexRowItems = ctx.tlmTreeMode ? 0 : ( rowPageToNavigate - 1 ) * page_size;
    var startIndexColItems = ctx.tlmTreeMode ? 0 : ( colPageToNavigate - 1 ) * page_size;

    // Create 1st row for column link totals
    var rowTotals = {
        sort: 0,
        name: '',
        uid: '',
        isParent: false,
        level: 0
    };
    row_nodes.push( rowTotals );

    var lengthOfRowLoop = startIndexRowItems + page_size > total_rows || ctx.tlmTreeMode ? total_rows : startIndexRowItems + page_size;

    var parents = new Map();
    for ( var ir = startIndexRowItems; ir <= lengthOfRowLoop - 1; ir++ ) {
        var row = data.rowObjects[ir];
        if ( row !== undefined ) {
            setLevel( row, parents );
            updateDisplayName( row, ctx );
            var rowData = {
                sort: ir,
                name: row.displayName,
                uid: row.occurrence.uid,
                isParent: data.matrixType !== 'Dynamic Matrix' ? row.isParent : false,
                type: row.persistentObject.type,
                level: row.level,
                parentUid: row.parentUid,
                isExpanded: row.isExpanded
            };
            revToOccMap[row.persistentObject.uid] = row.occurrence.uid;
            row_nodes.push( rowData );
        }
    }
    transformedData.row_nodes = row_nodes;

    // Create 1st column for row link totals
    var colTotals = {
        sort: 0,
        name: '',
        uid: '',
        isParent: false,
        level: 0
    };
    col_nodes.push( colTotals );

    var lengthOfColLoop = startIndexColItems + page_size > total_cols || ctx.tlmTreeMode ? total_cols : startIndexColItems + page_size;

    parents = new Map();
    for ( var ic = startIndexColItems; ic <= lengthOfColLoop - 1; ic++ ) {
        var col = data.colObjects[ic];
        if ( col !== undefined ) {
            setLevel( col, parents );
            updateDisplayName( col, ctx );
            var colData = {
                sort: ic,
                name: col.displayName,
                uid: col.occurrence.uid,
                isParent: data.matrixType !== 'Dynamic Matrix' ? col.isParent : false,
                type: col.persistentObject.type,
                level: col.level,
                parentUid: col.parentUid,
                isExpanded: col.isExpanded
            };
            revToOccMap[col.persistentObject.uid] = col.occurrence.uid;
            col_nodes.push( colData );
        }
    }
    transformedData.col_nodes = col_nodes;

    var filterLinkType = data.tlType.dbValue || 'ALL';

    for ( var i = 0; i < row_nodes.length; i++ ) {
        var rowUid = row_nodes[i].uid;
        var rowTotalLinks;
        for ( var j = 0; j < col_nodes.length; j++ ) {
            var colUid = col_nodes[j].uid;
            var myLink = {
                source: i,
                target: j,
                rowUid: rowUid,
                colUid: colUid,
                value: 0,
                numLinks: 0,
                direction: ''
            };

            // first column shows total for row, save it so it can be incremented.
            if ( j === 0 ) {
                rowTotalLinks = myLink;
            }

            var key = rowUid.concat( '+' ).concat( colUid );
            var linkInfo = linkMap[key];
            var deepCopiedLinkInfo = _.cloneDeep( linkInfo );
            if ( linkInfo && isFilteredByType( deepCopiedLinkInfo, filterLinkType ) ) {
                myLink.numLinks = deepCopiedLinkInfo.numOfLinksOnChildren;
                myLink.direction = linkInfo.tracelinkDirection;
                // set color intensity based on number of links
                var total = myLink.numLinks;
                if ( total > 0 ) {
                    myLink.value = total * 0.1 + 0.1;
                }

                // add links to total for row and column
                rowTotalLinks.numLinks += total;
                links[j].numLinks += total;

                myLink.text = getCellValue( deepCopiedLinkInfo, data.showChildCounts.dbValue );
            }

            links.push( myLink );
        }

        // Update row total cell
        if ( rowTotalLinks && rowTotalLinks.numLinks > 0 ) {
            rowTotalLinks.value = rowTotalLinks.numLinks * 0.1 + 0.1;
            rowTotalLinks.text = rowTotalLinks.numLinks;
        }
    }

    for ( var i = 0; i < col_nodes.length; i++ ) {
        if ( links[i].numLinks > 0 ) {
            links[i].text = links[i].numLinks;
            links[i].value = links[i].numLinks * 0.1 + 0.1;
        }
    }

    // give first row/column cell header large value so it won't move on sort
    links[0].value = 99999.9;
    transformedData.links = links;
    transformedData.showColor = ctx.highlightshowHeatmap;
    transformedData.showTraceLinks = ctx.showTracelinkDirection;
    transformedData.itemsPerPage = data.noOfItem.dbValue;
    if ( !transformedData.itemPerPage ) {
        data.noOfItem.dbValue = _page_size;
        transformedData.itemPerPage = data.noOfItem.dbValue;
    }

    transformedData.i18n = data.i18n;
    // set compare function to use for sorting
    transformedData.nodeCompareFunction = function( nodeArray, a, b ) {
        // use array index as secondary sort key to make the sort stable (nodes with equal value stay in same order)
        return nodeArray[b].value === nodeArray[a].value ? a - b : nodeArray[b].value - nodeArray[a].value;
    };
    return transformedData;
};

/**
 * IMPORTANT: This gets called when our viewModel gets unMounted to clear storage and globals when matrix gets destroyed
 */
var destroyTraceabilityMatrix = function( ) {
    window.sessionStorage.removeItem( 'serviceDataForTracelinkMatrix');
    window.sessionStorage.removeItem( 'req_generate_matrix_payload2');
    window.sessionStorage.removeItem( 'TraceabilityMatrixJsonFileFMSTicket');
    
    if(_data){
        _data = null;
    }
};

export default exports = {
    OpenCreateTracelinkPanel,
    OpenCloseCreateTracelinkPanel,
    processResponse,
    updateFileContentInFormData,
    tracelinkDeleted,
    loadFlatTableColumns,
    loadFlatTableData,
    showTracelinksPopup,
    closeMatrixTablePropView,
    getLinkTypes,
    refreshTraceabilityMatrix,
    tracelinkCreated,
    captureUserSelection,
    generateTraceabilityMatrix,
    init,
    openReplacePanel,
    resetTraceMatrix,
    rollupClicked,
    getChildMatrixInput,
    getTraceMatrixInput,
    setPageSize,
    toggleHeatMap,
    getNoOfItemsPerPage,
    isNavigationRequired,
    isSoapaginationRequired,
    getSelectedTypeOfTraceLink,
    performPagination,
    openCloseSaveTracelinkMatrixObjectPanel,
    refreshTracelinkMatrixObject,
    showUpdatedTLMatrix,
    loadTMOproperties,
    buildInputForSaveEditingTMO,
    getTraceMatrixInputForSave,
    getFileUrl,
    collapseNode,
    openArm0TraceabilityMatrixSettings,
    tracelinkDirectionChangeAction,
    toggleTlmView,
    updateValues,
    showEmptyRowsAndColsAction,
    sortTraceabilityMatrix,
    applyMatrixSettings,
    setServiceData,
    processDataFromServer,
    destroyTraceabilityMatrix,
    updateFMSFileToReplaceMatrix
};
/**
 * Define Tracealibility matrix service
 *
 * @memberof NgServices
 * @member Arm0TraceabilityMatrix
 * @param {Object} appCtxService app context service
 * @param {Object} cdm client data model service
 * @param {Object} listBoxService list box service
 * @param {Object} awColumnSvc aw column service
 * @param {Object} awTableSvc app table service
 * @param {Object} $q q service
 * @param {Object} uwPropertySvc uw property service
 * @param {Object} commandPanelService command panel service
 * @param {Object} requirementsUtils requirments util service
 * @param {Object} reqTraceabilityMatrixService  requirement Traceability Matrix service
 *
 * @return {Object} service exports exports
 */
app.factory( 'Arm0TraceabilityMatrix', () => exports );
