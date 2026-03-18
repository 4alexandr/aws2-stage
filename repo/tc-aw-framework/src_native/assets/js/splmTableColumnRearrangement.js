// Copyright (c) 2020 Siemens

/**
 * This service is used for plTable as Column Rearrangement
 *
 * @module js/splmTableColumnRearrangement
 *
 */
import _ from 'lodash';
import eventBus from 'js/eventBus';
import _t from 'js/splmTableNative';
import splmTableDragHandler from 'js/splmTableDragHandler';

/**
 * Instances of this class represent a column rearrangement utility for PL Table
 *
 * @class SPLMTableColumnRearrangement
 * @param {DOMElement} tableElem - HTML DOM Element for table
 */
var SPLMTableColumnRearrangement = function( tableElem ) {
    var _columnRearrangementInProgress = false;
    var _columnsRearranged = false;

    var self = this;

    /**
     * Attaches the drag header events to the header element paramter.
     *
     * @param {DOMElement} element - header element to attach drag events
     */
    var attachDragHeader = function( element ) {
        var nextX = 0;
        var currentX = 0;
        var clonedElement;
        var columnDef;
        var originalPosition;
        element.classList.add( 'noselect' );
        var columnDefElement = element.getElementsByClassName( _t.Const.CLASS_COLUMN_DEF )[ 0 ];

        var startDragElement = function( customEvent ) {
            // Clean up menu if exist
            var menuService = _t.util.getTableMenuService( tableElem );
            menuService.ensureAllTableMenusDismissed();

            var event = customEvent ? customEvent.detail : window.event;

            clonedElement = element.cloneNode( true );
            clonedElement.classList.add( _t.Const.CLASS_UTILITY_HIDDEN );

            clonedElement.setAttribute( 'id', clonedElement.id + 'ClonedHeader' );
            // Attachment to container because of rendering problems when attached to the row
            var elementContainer = _t.util.closestElement( element, '.' + _t.Const.CLASS_PIN_CONTAINER + ',.' + _t.Const.CLASS_SCROLL_CONTAINER );
            var scrollLeft = elementContainer.getElementsByClassName( _t.Const.CLASS_VIEWPORT )[ 0 ].scrollLeft;
            elementContainer.appendChild( clonedElement );

            clonedElement.style.left = element.offsetLeft - scrollLeft + 'px';
            clonedElement.style.top = element.offsetTop + 'px';

            currentX = event.clientX;

            if( columnDefElement && columnDefElement.columnDef ) {
                columnDef = columnDefElement.columnDef;
                originalPosition = columnDef.index;
            }
        };

        /**
         * Switch the column indexes of the column definitions attached to the headers.
         *
         * @param {DOMElement} header1 - first header
         * @param {DOMElement} header2 - second header
         *
         * @returns {Boolean} was column index switch successful?
         */
        var switchColumnDefIndexes = function( header1, header2 ) {
            var header1ColumnDefElement = header1.getElementsByClassName( _t.Const.CLASS_COLUMN_DEF )[ 0 ];
            var header2ColumnDefElement = header2.getElementsByClassName( _t.Const.CLASS_COLUMN_DEF )[ 0 ];

            if( header1ColumnDefElement && header1ColumnDefElement.columnDef && header2ColumnDefElement && header2ColumnDefElement.columnDef ) {
                var tempColumnIndex = header1ColumnDefElement.columnDef.index;
                header1ColumnDefElement.columnDef.index = header2ColumnDefElement.columnDef.index;
                header2ColumnDefElement.columnDef.index = tempColumnIndex;
                return true;
            }

            return false;
        };

        /**
         * Rearrange the column headers if the position parameter is outside the bounds of the original header element.
         *
         * @param {Number} positionX - The X position to check for position of drag
         */
        var rearrangeColumnHeaders = function( positionX ) {
            var elementBoundingBox = element.getBoundingClientRect();
            var nextSibling = element.nextSibling;
            var previousSibling = element.previousSibling;

            if( nextSibling && positionX > elementBoundingBox.right + nextSibling.getBoundingClientRect().width / 3 ) {
                if( nextSibling.classList.contains( 'noselect' ) ) {
                    if( switchColumnDefIndexes( nextSibling, element ) ) {
                        element.parentNode.insertBefore( nextSibling, element );
                        _columnsRearranged = true;
                    }
                }
            } else if( previousSibling && positionX < elementBoundingBox.left - previousSibling.getBoundingClientRect().width / 2 ) {
                if( previousSibling.classList.contains( 'noselect' ) ) {
                    if( switchColumnDefIndexes( previousSibling, element ) ) {
                        element.parentNode.insertBefore( element, previousSibling );
                        _columnsRearranged = true;
                    }
                }
            }
        };

        /**
         * Rearrange the content cells based on the columnDef indexes now.
         */
        var rearrangeContent = function() {
            if( originalPosition === columnDef.index ) {
                return;
            }
            var targetIndex = originalPosition < columnDef.index ? -1 : 1;
            var targetContentElements = _t.util.getColumnContentCellElementsByIndex( tableElem, columnDef.index + targetIndex );
            var draggedContentElements = _t.util.getColumnContentCellElementsByIndex( tableElem, columnDef.index );

            for( var i = 0; i < draggedContentElements.length; i++ ) {
                var currentContentElement = draggedContentElements[ i ];
                var currentTargetContentElement = targetContentElements[ i ];
                if( originalPosition < columnDef.index ) {
                    currentTargetContentElement = currentTargetContentElement.nextSibling;
                }
                currentContentElement.parentNode.insertBefore( currentContentElement, currentTargetContentElement );
            }
        };

        /**
         *  Event to run when movement of header is in progress. Moves the element and any headers it moves over.
         *
         * @param {DOMEvent} customEvent - event being sent ( wrapped from 'mousemove' )
         */
        var dragElement = function( customEvent ) {
            var event = customEvent ? customEvent.detail : window.event;

            if( !_columnRearrangementInProgress ) {
                element.classList.add( 'stationaryHeader' );
                clonedElement.classList.add( 'dragHeader' );
                clonedElement.classList.remove( _t.Const.CLASS_UTILITY_HIDDEN );
                _columnRearrangementInProgress = true;
            }

            nextX = currentX - event.clientX;
            currentX = event.clientX;

            clonedElement.style.left = clonedElement.offsetLeft - nextX + 'px';

            rearrangeColumnHeaders( event.clientX );
        };

        /**
         * End the drag movement and replace the original header element visibility.
         *
         */
        var closeDragElement = function() {
            element.classList.remove( 'stationaryHeader' );
            clonedElement.parentNode.removeChild( clonedElement );
            _columnRearrangementInProgress = false;

            if( _columnsRearranged ) {
                _columnsRearranged = false;
                var eventData = {
                    name: columnDef.name,
                    originalPosition: originalPosition
                };
                eventBus.publish( 'plTable.columnsRearranged_' + tableElem.id, eventData );

                rearrangeContent();
            }
        };

        // Column Header = Label + Sort Icon + Splitter
        // Sort Icon will occupy all spaces by flex-grow
        var contentsElement = element.getElementsByClassName( _t.Const.CLASS_CELL_CONTENTS )[ 0 ];
        splmTableDragHandler.enableDragging( contentsElement );
        contentsElement.addEventListener( _t.Const.EVENT_ON_ELEM_DRAG_START, startDragElement );
        contentsElement.addEventListener( _t.Const.EVENT_ON_ELEM_DRAG, dragElement );
        contentsElement.addEventListener( _t.Const.EVENT_ON_ELEM_DRAG_END, closeDragElement );
    };

    /**
     * Initializes the table with header column rearrangement by dragging.
     */
    self.initialize = function() {
        var headerCellElements = tableElem.getElementsByClassName( _t.Const.CLASS_HEADER_CELL );

        _.forEach( headerCellElements, function( headerCellElement ) {
            var columnDefinition;
            var foundElements = headerCellElement.getElementsByClassName( _t.Const.CLASS_COLUMN_DEF );
            if( foundElements.length > 0 ) {
                columnDefinition = foundElements[ 0 ].columnDef;
            }

            if( columnDefinition && columnDefinition.enableColumnMoving !== false ) {
                attachDragHeader( headerCellElement );
            }
        } );
    };

    self.initialize();

    return self;
};

export default SPLMTableColumnRearrangement;
