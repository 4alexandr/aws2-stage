// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * This service is create viewer visibility
 *
 * @module js/viewerVisibilityManagerProvider
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import msgSvc from 'js/messagingService';
import localeSvc from 'js/localeService';
import _ from 'lodash';
import assert from 'assert';
import 'jscom';
import 'manipulator';

var exports = {};

/**
 * Provides an instance of viewer visibility manager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {ViewerVisibilityManager} Returns viewer visibility manager
 */
export let getViewerVisibilityManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    return new ViewerVisibilityManager( viewerCtxNamespace, viewerView, viewerContextData );
};

/**
 * Class to hold the viewer context data
 *
 * @constructor ViewerVisibilityManager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 */
var ViewerVisibilityManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    assert( viewerContextData, 'Viewer context data can not be null' );

    var self = this;
    var _viewerCtxNamespace = viewerCtxNamespace;
    var _viewerView = viewerView;
    var _viewerContextData = viewerContextData;
    var _invisibleCsids = [];
    var _invisibleExceptionCsids = [];
    var ROOT_ID = '';

    var _viewerVisibilityChangedListeners = [];

    /**
     * Adding empty viewer event listener that is notified when the 3D viewer is empty after a search operation.
     */
    _viewerView.visibilityMgr.addEmptyViewerListener( {
        emptyViewerEvent: function( emptyViewerName ) {
            if( emptyViewerName === 'TcVisEmptyViewerWarning' ) {
                _showEmptyViewerWarningMessage();
            }
        }
    } );

    /**
     * Adding empty viewer event listener that is notified when the 3D viewer is empty after Selected On\Off operations.
     */
    _viewerView.searchMgr.addSearchResultsListener( {
        noResultsEvent: function() {
            _showEmptyViewerWarningMessage();
        }
    } );

    /**
     * Viewer selection types
     */
    self.VISIBILITY = {
        VISIBLE: 'VISIBLE',
        INVISIBLE: 'INVISIBLE',
        PARTIAL: 'PARTIAL'
    };

    /**
     * toggle part viewer visibility
     *
     * @param {String} csidChain csid chain of the model object
     */
    self.toggleProductViewerVisibility = function( csidChain ) {
        var initialVisibility = self.getProductViewerVisibility( csidChain );
        var finalVisibility = null;
        finalVisibility = processVisibility( initialVisibility, finalVisibility, csidChain, true );
        _viewerContextData.getViewerCtxSvc().updateViewerApplicationContext( _viewerCtxNamespace,
            _viewerContextData.getViewerCtxSvc().VIEWER_INVISIBLE_CSID_TOKEN, _invisibleCsids );

        _viewerContextData.getViewerCtxSvc().updateViewerApplicationContext( _viewerCtxNamespace,
            _viewerContextData.getViewerCtxSvc().VIEWER_INVISIBLE_EXCEPTION_CSID_TOKEN,
            _invisibleExceptionCsids );

        self.setPartsVisibility( [ csidChain ], finalVisibility === self.VISIBILITY.VISIBLE, false );
        //determine

        return finalVisibility;
    };

    /**
     * Set packed occurence visibility based on the visbility flag input.
     *
     * @param {String} csidChain csid chain of the model object
     * @param {Boolean} visibility Visibility to be applied on the packed occurences.
     */
    self.setPackedPartsVisibility = function( csidChain, visibility ) {
        var initialVisibility = self.getProductViewerVisibility( csidChain );
        var finalVisibility = null;
        if( visibility ) {
            finalVisibility = 'VISIBLE';
        } else {
            finalVisibility = 'INVISIBLE';
        }
        processVisibility( initialVisibility, finalVisibility, csidChain, false );
        _viewerContextData.getViewerCtxSvc().updateViewerApplicationContext( _viewerCtxNamespace,
            _viewerContextData.getViewerCtxSvc().VIEWER_INVISIBLE_CSID_TOKEN, _invisibleCsids );

        _viewerContextData.getViewerCtxSvc().updateViewerApplicationContext( _viewerCtxNamespace,
            _viewerContextData.getViewerCtxSvc().VIEWER_INVISIBLE_EXCEPTION_CSID_TOKEN,
            _invisibleExceptionCsids );

        self.setPartsVisibility( [ csidChain ], finalVisibility === self.VISIBILITY.VISIBLE, false );
    };

    /**
     * toggle part viewer visibility
     *
     * @param {String} csidChain csid chain of the model object
     */
    self.getProductViewerVisibility = function( csidChain ) {
        var selfVisibility = _findNearestParentVisibility( csidChain );
        var childIsDifferent = _findDifferentChildOf( csidChain, selfVisibility );

        if( selfVisibility === self.VISIBILITY.VISIBLE ) {
            return childIsDifferent ? self.VISIBILITY.PARTIAL : self.VISIBILITY.VISIBLE;
        }
        return childIsDifferent ? self.VISIBILITY.PARTIAL : self.VISIBILITY.INVISIBLE;
    };

    /**
     * Checks for the visibility state of the nearest parent, after first checking for self.<br>
     * Only VISIBLE and INVISIBLE are possible results. (never PARTIAL)
     *
     * @param {String} csidChain csid chain of the model object
     * @return (self.VISIBILITY) The visibility state based on the search.
     */
    function _findNearestParentVisibility( csidChain ) {
        if( _.includes( _invisibleExceptionCsids, csidChain ) ) {
            return self.VISIBILITY.VISIBLE;
        }
        if( _.includes( _invisibleCsids, csidChain ) ) {
            return self.VISIBILITY.INVISIBLE;
        }

        var parentCsidChains = _getParentCsidChains( csidChain );

        for( var i = 0; i < parentCsidChains.length; i++ ) {
            if( _.includes( _invisibleExceptionCsids, parentCsidChains[ i ] ) ) {
                return self.VISIBILITY.VISIBLE;
            }
            if( _.includes( _invisibleCsids, parentCsidChains[ i ] ) ) {
                return self.VISIBILITY.INVISIBLE;
            }
        }

        // no state in parents, need to look at root
        if( _.includes( _invisibleCsids, '' ) ) {
            return self.VISIBILITY.INVISIBLE;
        }

        return self.VISIBILITY.VISIBLE;
    }

    /**
     * Pulls all the parent CSIDs from the given CSID. Ordered as nearest parent at the lowest index.
     *
     * @param {String} csidChain csid chain of the model object
     * @return (Array) An array containing any parent CSIDs.
     */
    function _getParentCsidChains( csidChain ) {
        var parentCsidChains = [];
        if( _.isUndefined( csidChain ) || _.isNull( csidChain ) || csidChain.indexOf( '/' ) === 0 ) {
            return parentCsidChains;
        }

        var tempCsidChain = csidChain;
        var nextSlash = tempCsidChain.lastIndexOf( '/', tempCsidChain.length - 2 );
        while( nextSlash !== -1 ) {
            tempCsidChain = tempCsidChain.substring( 0, nextSlash );
            parentCsidChains.push( tempCsidChain );
            nextSlash = tempCsidChain.lastIndexOf( '/', tempCsidChain.length - 2 );
        }

        return parentCsidChains;
    }

    /**
     * Searches for children that are different than the given state.
     *
     * @param csidChain the self CSID chain
     * @param selfVisible looking for children different than this state.
     * @return (Boolean) if any children were found to have different visibility.
     */
    function _findDifferentChildOf( csidChain, selfVisible ) {
        if( selfVisible === self.VISIBILITY.VISIBLE ) {
            for( var i = 0; i < _invisibleCsids.length; i++ ) {
                if( _invisibleCsids[ i ].lastIndexOf( csidChain, 0 ) === 0 ) {
                    return true;
                }
            }
        } else {
            for( var i = 0; i < _invisibleExceptionCsids.length; i++ ) {
                if( _invisibleExceptionCsids[ i ].lastIndexOf( csidChain, 0 ) === 0 ) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Removes all children of the given CSID.
     *
     * @param csidChain The CSID to search for children of.
     * @return (Number) The number of children culled.
     */
    function _clearChildren( csidChain ) {
        var foundChildren = [];
        var removedCount = 0;
        _.forEach( _invisibleCsids, function( invisibleCsidChain ) {
            if( invisibleCsidChain.lastIndexOf( csidChain, 0 ) === 0 ) {
                foundChildren.push( invisibleCsidChain );
            }
        } );
        _.remove( foundChildren, function( child ) {
            return child === csidChain;
        } );

        _.remove( _invisibleCsids, function( child ) {
            return _.includes( foundChildren, child );
        } );

        removedCount = foundChildren.length;
        foundChildren.length = 0;

        _.forEach( _invisibleExceptionCsids, function( invisibleExpCsidChain ) {
            if( invisibleExpCsidChain.lastIndexOf( csidChain, 0 ) === 0 ) {
                foundChildren.push( invisibleExpCsidChain );
            }
        } );

        _.remove( foundChildren, function( child ) {
            return child === csidChain;
        } );

        _.remove( _invisibleExceptionCsids, function( child ) {
            return _.includes( foundChildren, child );
        } );

        removedCount += foundChildren.length;
        foundChildren.length = 0;

        return removedCount;
    }

    /**
     * Viewer visibility changed listener
     */
    var viewerVisibilityListener = {
        visibilityTurnedOn: function( occurrences ) {
            _handleVisibilityOfOccurrencesFromViewer( occurrences, true, false );
        },
        visibilityTurnedOff: function( occurrences ) {
            _handleVisibilityOfOccurrencesFromViewer( occurrences, false, false );
        },
        updateVisibleState: function( occurrences ) {
            if( occurrences.length === 0 ) {
                occurrences.push( _viewerContextData.getViewerCtxSvc().createViewerOccurance( '' ) );
                _handleVisibilityOfOccurrencesFromViewer( occurrences, false, true );
            } else {
                _handleVisibilityOfOccurrencesFromViewer( occurrences, true, true );
            }
        }
    };

    /**
     * Handle visibility of occurrences from viewer
     *
     * @param {Array} occsFromViewer Array of CSID chain of occurrences
     * @param {Boolean} visibilityToSet visibility to set
     * @param {Boolean} isStateChange is state change
     */
    function _handleVisibilityOfOccurrencesFromViewer( occsFromViewer, visibilityToSet, isStateChange ) {
        if( !Array.isArray( occsFromViewer ) || occsFromViewer.length <= 0 ) {
            return;
        }

        var occurrencesFromViewer = [];
        _.forEach( occsFromViewer, function( occurrence, key ) {
            if( occurrence.type === 1 ) {
                var occCSIDChain = occurrence.theStr;
                if( _.endsWith( occCSIDChain, '/' ) ) {
                    occCSIDChain = occCSIDChain.slice( 0, -1 );
                }
                occurrencesFromViewer.push( occCSIDChain );
            }
        } );

        if( occurrencesFromViewer.length <= 0 ) {
            return;
        }
        //Always process root irrespective of isStateChange.
        if( occurrencesFromViewer.length === 1 && occurrencesFromViewer[ 0 ] === ROOT_ID ) {
            _clearVisibility();
            if( visibilityToSet ) {
                _invisibleExceptionCsids.push( ROOT_ID );
            } else {
                _invisibleCsids.push( ROOT_ID );
            }
        } else {
            if( isStateChange ) {
                _clearVisibility();
                if( visibilityToSet ) {
                    // If this is state change we need to change Root Visibility because
                    // Viewer does not send notification what parts are turned on/off
                    // when user does Volume and Proximity search.
                    _invisibleCsids.push( ROOT_ID );
                } else {
                    _invisibleExceptionCsids.push( ROOT_ID );
                }
            }
            for( var i = 0; i < occurrencesFromViewer.length; i++ ) {
                _updateVisibilityAllChildrenOfGivenOccurrence( occurrencesFromViewer[ i ], visibilityToSet );
            }
        }
        _notifyViewerVisibilityChanged( occurrencesFromViewer, visibilityToSet, isStateChange );
    }

    /**
     * Update visibility of all children of given parent assembly
     *
     * @param {Object} occurrence parent occurrence
     * @param {Boolean} visibilityToSet visibility to set
     */
    function _updateVisibilityAllChildrenOfGivenOccurrence( occurrence, visibilityToSet ) {
        if( visibilityToSet ) {
            var invisibleChildren = _findTheInvisibleChildrenOf( occurrence );
            invisibleChildren.push( occurrence );
            _.remove( _invisibleCsids, function( currentObject ) {
                return invisibleChildren.indexOf( currentObject ) >= 0;
            } );
            _invisibleExceptionCsids = _.union( _invisibleExceptionCsids, invisibleChildren );
        } else {
            var invisibleExceptionChildren = _findTheInvisibleExceptionChildrenOf( occurrence );
            invisibleExceptionChildren.push( occurrence );
            _.remove( _invisibleExceptionCsids, function( currentObject ) {
                return invisibleExceptionChildren.indexOf( currentObject ) >= 0;
            } );
            _invisibleCsids = _.union( _invisibleCsids, invisibleExceptionChildren );
        }
    }

    /**
     * Finds the invisible children of given modelObject
     *
     * @param {String} parentCSID The CSID of the modelObject whose invisible child is searched
     * @return {Array} array of the invisible children
     */
    function _findTheInvisibleChildrenOf( parentCSID ) {
        var returnArray = [];
        for( var i = 0; i < _invisibleCsids.length; i++ ) {
            if( _invisibleCsids[ i ].indexOf( parentCSID ) === 0 && _invisibleCsids[ i ] !== parentCSID ) {
                returnArray.push( _invisibleCsids[ i ] );
            }
        }
        return returnArray;
    }

    /**
     * Finds the invisible exception children of given modelObject
     *
     * @param {String} parentCSID The CSID of the modelObject whose invisible child is searched
     * @return {Array} array of the invisible exception children
     */
    function _findTheInvisibleExceptionChildrenOf( parentCSID ) {
        var returnArray = [];
        for( var i = 0; i < _invisibleExceptionCsids.length; i++ ) {
            if( _invisibleExceptionCsids[ i ].indexOf( parentCSID ) === 0 &&
                _invisibleExceptionCsids[ i ] !== parentCSID ) {
                returnArray.push( _invisibleExceptionCsids[ i ] );
            }
        }
        return returnArray;
    }

    /**
     * Clear visibility
     */
    function _clearVisibility() {
        _invisibleCsids.length = 0;
        _invisibleExceptionCsids.length = 0;
    }

    /**
     * get part visibility
     *
     * @param {String} csidChain csid chains of the model object
     * @return {Boolean} boolean indicating visible or not
     */
    self.isVisible = function( csidChain ) {
        var visibility = self.getProductViewerVisibility( csidChain );
        if( visibility === self.VISIBILITY.INVISIBLE || visibility === self.VISIBILITY.PARTIAL ) {
            return false;
        }
        return true;
    };

    /**
     * Get invisible csids
     *
     * @return {Array} array of invisible csid chains
     */
    self.getInvisibleCsids = function() {
        return _invisibleCsids;
    };

    /**
     * Get invisible exception csids
     *
     * @return {Array} array of invisible exception csid chains
     */
    self.getInvisibleExceptionCsids = function() {
        return _invisibleExceptionCsids;
    };

    /**
     * set part viewer visibility
     *
     * @param {Array} csidChains csid chains of the model objects
     * @param {Boolean} isVisible should be made visible or turned off
     * @param {Boolean} notifyChange should viewer notification be fired
     *
     * @return {Promise} A promise that is resolved or rejected when the operation has completed.
     */
    self.setPartsVisibility = function( csidChains, isVisible, notifyChange ) {
        var isNotifyChange = false;
        if( !_.isUndefined( notifyChange ) && !_.isNull( notifyChange ) && typeof notifyChange === 'boolean' ) {
            isNotifyChange = notifyChange;
        }
        var occurrences = [];
        _.forEach( csidChains, function( csidChain ) {
            var occ = _viewerContextData.getViewerCtxSvc().createViewerOccurance( csidChain );
            occurrences.push( occ );
        } );
        return _viewerView.visibilityMgr.setVisible( occurrences, isVisible, isNotifyChange );
    };

    /**
     * set parts viewer visibility state
     *
     * @param {Array} csidChains csid chains of the model objects
     * @param {Boolean} notifyChange should viewer notification be fired
     *
     * @return {Promise} A promise that is resolved or rejected when the operation has completed.
     */
    self.setVisibleState = function( csidChains, notifyChange ) {
        var isNotifyChange = true;
        if( !_.isUndefined( notifyChange ) && !_.isNull( notifyChange ) && typeof notifyChange === 'boolean' ) {
            isNotifyChange = notifyChange;
        }
        var occurrences = [];
        _.forEach( csidChains, function( csidChain ) {
            var occ = _viewerContextData.getViewerCtxSvc().createViewerOccurance( csidChain );
            occurrences.push( occ );
        } );
        return _viewerView.visibilityMgr.setVisibleState( occurrences, isNotifyChange );
    };

    /**
     * Add viewer visibility changed listener
     *
     * @param {Object} observerFunction function to be registered
     */
    self.addViewerVisibilityChangedListener = function( observerFunction ) {
        if( typeof observerFunction === 'function' ) {
            _viewerVisibilityChangedListeners.push( observerFunction );
        }
    };

    /**
     * remove viewer visibility changed listener
     *
     * @param {Object} observerFunction function to be removed
     */
    self.removeViewerVisibilityChangedListener = function( observerFunction ) {
        if( typeof observerFunction === 'function' ) {
            var indexToBeRemoved = _viewerVisibilityChangedListeners.indexOf( observerFunction );
            if( indexToBeRemoved > -1 ) {
                _viewerVisibilityChangedListeners.splice( indexToBeRemoved, 1 );
            }
        }
    };

    /**
     * Notify viewer visibility changed listener
     *
     * @param {Array} occurrencesFromViewer Array of CSID chain of occurrences
     * @param {Boolean} visibilityToSet visibility to set
     * @param {Boolean} isStateChange is state change
     */
    var _notifyViewerVisibilityChanged = function( occurrencesFromViewer, visibilityToSet, isStateChange ) {
        _viewerContextData.getViewerCtxSvc().updateViewerApplicationContext( _viewerCtxNamespace,
            _viewerContextData.getViewerCtxSvc().VIEWER_INVISIBLE_CSID_TOKEN, _invisibleCsids );
        _viewerContextData.getViewerCtxSvc().updateViewerApplicationContext( _viewerCtxNamespace,
            _viewerContextData.getViewerCtxSvc().VIEWER_INVISIBLE_EXCEPTION_CSID_TOKEN,
            _invisibleExceptionCsids );
        if( _viewerVisibilityChangedListeners.length > 0 ) {
            _.forEach( _viewerVisibilityChangedListeners, function( observer ) {
                observer.call( null, occurrencesFromViewer, visibilityToSet, isStateChange );
            } );
        }
    };

    /**
     * returns all Visible occs in Viewer
     *
     * @returns {[Object]} All visible occurrences in viewer
     */
    self.getVisibleOccsInViewer = function() {
        return _viewerView.visibilityMgr.getVisible();
    };

    /**
     * Restore visibility of viewer after connection timeout
     *
     * @param {[String]} invisibles Array of invisible csid strings
     * @param {[String]} invisibleExceptions Array of invisible exception csid strings
     *
     * @returns {Promise} promise thats resolved when visibility is restored
     */
    self.restoreViewerVisibility = function( invisibles, invisibleExceptions ) {
        var returnPromise = AwPromiseService.instance.defer();
        var isRootVisible = true;
        _clearVisibility();
        if( invisibles && Array.isArray( invisibles ) && _.includes( invisibles, ROOT_ID ) ) {
            isRootVisible = false;
        }
        if( invisibles && Array.isArray( invisibles ) && invisibles.length > 0 ) {
            for( var i = 0; i < invisibles.length; i++ ) {
                _invisibleCsids.push( invisibles[ i ] );
            }
        }
        if( invisibleExceptions && Array.isArray( invisibleExceptions ) && invisibleExceptions.length > 0 ) {
            for( var i = 0; i < invisibleExceptions.length; i++ ) {
                _invisibleExceptionCsids.push( invisibleExceptions[ i ] );
            }
        }
        self.setPartsVisibility( [ ROOT_ID ], isRootVisible, false ).then(
            function() {
                _restoreViewerOccVisibility( invisibles, invisibleExceptions ).then( function() {
                    returnPromise.resolve();
                }, function( errorMsg ) {
                    returnPromise.reject( errorMsg );
                } );
            },
            function( errorMsg ) {
                returnPromise.reject( errorMsg );
            }
        );
        return returnPromise.promise;
    };

    /**
     * Restore visibility of viewer after connection timeout
     *
     * @param {[String]} invisibles Array of invisible csid strings
     * @param {[String]} invisibleExceptions Array of invisible exception csid strings
     *
     * @returns {Promise} promise thats resolved when visibility is restored
     */
    var _restoreViewerOccVisibility = function( invisibles, invisibleExceptions ) {
        var returnPromise = AwPromiseService.instance.defer();
        _applyVisibility( invisibles, invisibleExceptions ).then( function( nextPassData ) {
            if( !nextPassData ||
                nextPassData.nextInvisibles && _.isEmpty( nextPassData.nextInvisibles ) &&
                ( nextPassData.nextInvisibleExceptions && _.isEmpty( nextPassData.nextInvisibleExceptions ) ) ) {
                returnPromise.resolve();
            } else {
                _restoreViewerOccVisibility( nextPassData.nextInvisibles, nextPassData.nextInvisibleExceptions ).then(
                    function() {
                        returnPromise.resolve();
                    },
                    function( errorMsg ) {
                        returnPromise.reject( errorMsg );
                    }
                );
            }
        } );

        return returnPromise.promise;
    };

    /**
     * Apply visibility to parts
     *
     * @param {[String]} invisibles Array of invisible csid strings
     * @param {[String]} invisibleExceptions Array of invisible exception csid strings
     *
     * @returns {Promise} promise thats resolved when visibility is restored
     */
    var _applyVisibility = function( invisibles, invisibleExceptions ) {
        var returnPromise = AwPromiseService.instance.defer();
        if( !invisibles || _.isEmpty( invisibles ) ) {
            if( invisibleExceptions && !_.isEmpty( invisibleExceptions ) ) {
                self.setPartsVisibility( invisibleExceptions, true, false ).then(
                    function() {
                        returnPromise.resolve();
                    },
                    function( errorMsg ) {
                        returnPromise.reject( errorMsg );
                    }
                );
            } else {
                returnPromise.resolve();
            }
            return returnPromise.promise;
        }

        if( !invisibleExceptions || _.isEmpty( invisibleExceptions ) ) {
            if( invisibles && !_.isEmpty( invisibles ) ) {
                self.setPartsVisibility( invisibles, false, false ).then(
                    function() {
                        returnPromise.resolve();
                    },
                    function( errorMsg ) {
                        returnPromise.reject( errorMsg );
                    }
                );
            } else {
                returnPromise.resolve();
            }
            return returnPromise.promise;
        }

        var nextInvisibles = _findChildrenOf( invisibleExceptions, invisibles );
        var nextInvisibleExceptions = _findChildrenOf( invisibles, invisibleExceptions );

        var filteredInvisibles = _.filter( invisibles, function( currInvisibleCsid ) {
            return !_.includes( nextInvisibles, currInvisibleCsid );
        } );

        var filteredInvisiblesExceptions = _.filter( invisibleExceptions, function( currInvisibleExcCsid ) {
            return !_.includes( nextInvisibleExceptions, currInvisibleExcCsid );
        } );

        self.setPartsVisibility( filteredInvisibles, false, false ).then(
            function() {
                self.setPartsVisibility( filteredInvisiblesExceptions, true, false ).then(
                    function() {
                        returnPromise.resolve( {
                            nextInvisibles: nextInvisibles,
                            nextInvisibleExceptions: nextInvisibleExceptions
                        } );
                    },
                    function( errorMsg ) {
                        returnPromise.reject( errorMsg );
                    }
                );
            },
            function( errorMsg ) {
                returnPromise.reject( errorMsg );
            }
        );
        return returnPromise.promise;
    };

    /**
     * Searches for any children of the given parents.<br>
     * This is a linear search but the lists should be sparse and decreasing in size on every iteration.
     *
     * @param {[String]} parents The parent CSIDs
     * @param {[String]} children The children CSIDs
     * @return {[String]} any found children or empty collection.
     */
    var _findChildrenOf = function( parents, children ) {
        var foundChildren = [];
        for( var i = 0; i < parents.length; i++ ) {
            for( var j = 0; j < children.length; j++ ) {
                if( parents[ i ].length < children[ j ].length && children[ j ].startsWith( parents[ i ] ) ) {
                    foundChildren.push( children[ j ] );
                }
            }
        }
        return foundChildren;
    };

    /**
     * Shows empty viewer warning message
     */
    var _showEmptyViewerWarningMessage = function() {
        localeSvc.getTextPromise( 'Awv0threeDViewerMessages' ).then( function( localizationBundle ) {
            msgSvc.showInfo( localizationBundle.tcVisEmptyViewerError );
        } );
    };

    var processVisibility = function( initialVisibility, finalVisibility, csidChain, toggleVisibility ) {
        switch ( initialVisibility ) {
            case self.VISIBILITY.INVISIBLE: //toggle invisible to visible
            case self.VISIBILITY.PARTIAL: //toggle partial to visible
                //if invisible because of self, remove self invisible
                var indexToBeRemoved = _invisibleCsids.indexOf( csidChain );
                if( indexToBeRemoved > -1 ) {
                    _invisibleCsids.splice( indexToBeRemoved, 1 );
                }
                //if still invisible because of parent, add self exception
                if( _findNearestParentVisibility( csidChain ) === self.VISIBILITY.INVISIBLE ) {
                    _invisibleExceptionCsids.push( csidChain );
                }
                _clearChildren( csidChain );
                if( toggleVisibility ) {
                    finalVisibility = self.VISIBILITY.VISIBLE;
                }
                break;
            case self.VISIBILITY.VISIBLE: //toggle visible to invisible
                //if visible because of self, remove self exception
                var indexToBeRemoved = _invisibleExceptionCsids.indexOf( csidChain );
                if( indexToBeRemoved > -1 ) {
                    _invisibleExceptionCsids.splice( indexToBeRemoved, 1 );
                }
                //if still visible because of parent, add self exception
                if( _findNearestParentVisibility( csidChain ) === self.VISIBILITY.VISIBLE ) {
                    _invisibleCsids.push( csidChain );
                }
                _clearChildren( csidChain );
                if( toggleVisibility ) {
                    finalVisibility = self.VISIBILITY.INVISIBLE;
                }
        }
        return finalVisibility;
    };

    /**
     * clear viewer visibility
     */
    self.cleanUp = function() {
        _invisibleCsids.length = 0;
        _invisibleExceptionCsids.length = 0;
        _viewerVisibilityChangedListeners.length = 0;
        _viewerView.visibilityMgr.removeVisibilityListener( viewerVisibilityListener );
    };

     /**
     * Remove Analysis result
     */
    self.removeAnalysisResult = function() {
        _viewerView.visibilityMgr.removeAnalysisResult();
    };

    _viewerView.visibilityMgr.addVisibilityListener( viewerVisibilityListener );
    _viewerContextData.getViewerCtxSvc().updateViewerApplicationContext( _viewerCtxNamespace,
        _viewerContextData.getViewerCtxSvc().VIEWER_INVISIBLE_CSID_TOKEN, _invisibleCsids );
    _viewerContextData.getViewerCtxSvc().updateViewerApplicationContext( _viewerCtxNamespace,
        _viewerContextData.getViewerCtxSvc().VIEWER_INVISIBLE_EXCEPTION_CSID_TOKEN, _invisibleExceptionCsids );
};

export default exports = {
    getViewerVisibilityManager
};
/**
 * This service is used to get ViewerVisibilityManager
 *
 * @memberof NgServices
 */
app.factory( 'viewerVisibilityManagerProvider', () => exports );
