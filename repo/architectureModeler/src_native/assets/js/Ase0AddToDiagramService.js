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
 *
 *
 * @module js/Ase0AddToDiagramService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import dms from 'soa/dataManagementService';
import occmgmtVisibilitySvc from 'js/occmgmtVisibility.service';
import cdm from 'soa/kernel/clientDataModel';
import removeFromDiagramSvc from 'js/Ase0RemoveFromDiagramService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import cmm from 'soa/kernel/clientMetaModel';

var exports = {};

/**
 * Toggle on element from ace
 *
 * @param {Object} data required to get primary object excluded list.
 * @param {Object} eventData event data required to toggle on node
 */
export let toggleOnVisibility = function( data, eventData ) {
    //User is trying to toggle on in diagram
    var invalidObject;
    var eventData2 = {};
    _.forEach( eventData.elementsToAdd, function( elementToAdd ) {
        if( !checkForValidObjectToAdd( data, elementToAdd ) ) {
            invalidObject = elementToAdd;
            return false;
        }
    } );
    if( invalidObject ) {
        eventData2 = {
            notValidObject: invalidObject
        };
        eventBus.publish( 'AMGraphEvent.notValidObjectToAdd', eventData2 );
        return;
    }

    var anchorElements = [];
    _.forEach( eventData.elementsToAdd, function( elementToAdd ) {
        if( !( cmm.isInstanceOf( 'Awb0Connection', elementToAdd.modelType ) || cmm.isInstanceOf(
                'FND_TraceLink', elementToAdd.modelType ) || cmm.isInstanceOf( 'Ase0RelationProxyObject', elementToAdd.modelType ) ) ) {
            //Node is selected for addition hence add the element in the anchorElementList
            anchorElements.push( elementToAdd );
        }
    } );
    var cursorLocation = [];
    if( eventData.positionInfo ) {
        cursorLocation = eventData.positionInfo;
    }

    addObjectsToDiagram( eventData.elementsToAdd, anchorElements, null, cursorLocation );
};

/**
 * Validate the object which is going to be toggle on For example signal and interface can not be toggle on from
 * ace
 * @param {Object} data required to get primary object excluded list.
 * @param {Object} elementToValidate element to validate
 *
 * @returns {boolean} is valid object for add
 */
var checkForValidObjectToAdd = function( data, elementToValidate ) {
    var validItem = true;
    _.forEach( data.primaryWorkAreaExcludedTypes, function( excludedType ) {
        var selectedElementObject = elementToValidate;
        if( cmm.isInstanceOf( 'Ase0RelationProxyObject', elementToValidate.modelType ) ) {
            selectedElementObject = elementToValidate.props.ase0SelectedElement;
        }
        if( selectedElementObject && selectedElementObject.modelType &&
            cmm.isInstanceOf( excludedType, selectedElementObject.modelType ) ) {
            validItem = false;
        }
    } );
    return validItem;
};

var getScopeOfTracelinkProxy = function( relationProxyObject ) {
    var scope = 'Global'; //$NON-NLS-1$
    if( cmm.isInstanceOf( 'Ase0TracelinkRelationProxy', relationProxyObject.modelType ) ) {
        var isOccurance = relationProxyObject.props.ase0IsOccurrenceTracelink;

        if( isOccurance ) {
            if( isOccurance.dbValues[ 0 ] ) {
                scope = 'Context';
            }
        }
    }
    return scope;
};

/**
 * get all ActiveFilters based on the filters from Legend
 *
 * @param filters
 * @return array the Active Filters
 */
var getActiveFilters = function( filters ) {
    if( !filters ) {
        return;
    }
    return _.reduce( filters, function( all, item ) {
        _.forEach( item.categories, function( category ) {
            if( category.isFiltered ) {
                _.forEach( category.subCategories, function( subcategory ) {
                    all.push( subcategory );
                } );
            }
        } );
        return all;
    }, [] );
};

var checkAllowedInFilter = function( relatedObject, relationObject, relationObjectNameSet, scope ) {
    if( !occmgmtVisibilitySvc.getOccVisibility( relatedObject ) ) {
        var filterObjects = getFilteredObjectsInLegend( relatedObject );
        if( filterObjects.indexOf( relatedObject ) > -1 ) {
            return false;
        }
    }

    if( cmm.isInstanceOf( 'Awb0Connection', relationObject.modelType ) ||
        cmm.isInstanceOf( 'FND_TraceLink', relationObject.modelType ) ) {
        var filterObjects = getFilteredObjectsInLegend( relationObject );
        if( filterObjects.length > 0 ) {
            return false;
        }
    }
    return true;
};

/**
 * Checking if filters applied from legend for given objects and return the array of objects which are filtered
 *
 * @param {Array} elements elements to check legend filter
 * @returns {Array} filteredObjects objects which are filtered as per legend filter
 */
var getFilteredObjectsInLegend = function( elements ) {
    var filtered = [];
    var graphContext = appCtxSvc.getCtx( "graph" );
    if( graphContext && graphContext.legendState && graphContext.legendState.activeView ) {
        var activeLegendView = graphContext.legendState.activeView;
        // get all filters
        filtered = getActiveFilters( activeLegendView.categoryTypes );
    }
    var filteredObjects = [];
    if( !elements || filtered.length === 0 ) {
        return filteredObjects;
    }

    if( _.isArray(elements) ) {
        _.forEach( elements,
            function( element ) {
                var type = null;
                // Check if category is filtered in legend
                if( cmm.isInstanceOf( 'FND_TraceLink', element.modelType ) ) {
                    type = element.modelType.name;
                } else if( cmm.isInstanceOf( 'Awb0Element', element.modelType ) &&
                    element.props.awb0UnderlyingObject ) {
                    var revObjectUid = element.props.awb0UnderlyingObject.dbValues[ 0 ];
                    if( revObjectUid ) {
                        var revObject = cdm.getObject( revObjectUid );
                        if( revObject && revObject.modelType ) {
                            type = revObject.modelType.name;
                        }
                    }
                }
                _.forEach( filtered, function( filteredType ) {
                    if( type && filteredType.internalName === type ) {
                        filteredObjects.push( element );
                    }
                } );
            } );
        } else {
            var type = null;
            // Check if category is filtered in legend
            if( cmm.isInstanceOf( 'FND_TraceLink', elements.modelType ) ) {
                type = elements.modelType.name;
            } else if( cmm.isInstanceOf( 'Awb0Element', elements.modelType ) &&
                elements.props.awb0UnderlyingObject ) {
                var revObjectUid = elements.props.awb0UnderlyingObject.dbValues[ 0 ];
                if( revObjectUid ) {
                    var revObject = cdm.getObject( revObjectUid );
                    if( revObject && revObject.modelType ) {
                        type = revObject.modelType.name;
                    }
                }
            }
            _.forEach( filtered, function( filteredType ) {
                if( type && filteredType.internalName === type ) {
                    filteredObjects.push( elements );
                }
            } );
        }

    return filteredObjects;
};

/**
 * Checking if filters applied from legend for objects going to be added in diagram. It fires
 * AMManageDiagramEvent event to call manageDiagram2 SOA for adding new objects to diagram and it fires
 * AMGraphEvent.filteredType event if any objects are filtered from legend and not allowed to add in diagram
 *
 * @param {array} elements elements to add to diagram
 * @param {array} anchorNodes anchor nodes to be set as root node
 * @param {array} createNodeQueue node information
 * @param {array} positionInformation of the nodes to be drawn on graph
 * @param {array} deletedObjects elements removed as part of drag & drop
 */
var addObjectsToDiagram = function( elements, anchorNodes, createNodeQueue, positionInformation, deletedObjects ) {
    if( !elements || elements.length < 1 ) {
        return;
    }
    var elementsToAdd = [];
    var totalRelationObject = 0;
    var relationObjectNameSet = [];

    //If object is proxy objects means trying to add the elements from relations panel.
    _.forEach( elements, function( element ) {
        if( cmm.isInstanceOf( 'Ase0RelationProxyObject', element.modelType ) ) {
            ++totalRelationObject;
        }
    } );

    //If totalRelationObject is 0 then means user is trying to add the elements from ACE or using add child
    if( totalRelationObject < 1 ) {
        var eventData1 = null;
        var filteredObjects = getFilteredObjectsInLegend( elements );
        _.forEach( elements, function( element ) {
            if( filteredObjects && filteredObjects.indexOf( element ) > -1 ) {
                var eventData = {
                    filteredObject: element
                };
                eventBus.publish( 'AMGraphEvent.filteredType', eventData );
                return true;
            }
            elementsToAdd.push( element );
        } );

        var anchorElementsUid = [];
        _.forEach( anchorNodes, function( anchorNode ) {
            anchorElementsUid.push( anchorNode.uid );
        } );
        if( elementsToAdd.length > 0 ) {
            eventData1 = {
                userAction: 'AddToDiagram',
                elementsToAdd: elementsToAdd,
                anchorElements: anchorElementsUid,
                positionInfo: positionInformation,
                deletedObjects: deletedObjects
            };

            if( createNodeQueue && createNodeQueue.length > 0 ) {
                eventData1.eventName = 'AMGraphEvent.createNodeCompleted';
            }
            eventBus.publish( 'AMManageDiagramEvent', eventData1 );
        }
    } else { //User is trying to add the elements from relations panel
        _.forEach( elements, function( element ) {
            if( cmm.isInstanceOf( 'Ase0RelationProxyObject', element.modelType ) ) {
                var endElement = cdm.getObject( element.props.ase0RelatedElement.dbValues[ 0 ] );
                var relationElement = cdm.getObject( element.props.ase0RelationElement.dbValues[ 0 ] );

                if( endElement && relationElement ) {
                    if( !checkAllowedInFilter( endElement, relationElement, relationObjectNameSet,
                            getScopeOfTracelinkProxy( element ) ) ) {
                        relationObjectNameSet.push( relationElement );
                        return true;
                    }
                }

                var selectedElement = cdm.getObject( element.props.ase0SelectedElement.dbValues[ 0 ] );
                if( !occmgmtVisibilitySvc.getOccVisibility( selectedElement ) ) {
                    if( elementsToAdd.indexOf( selectedElement ) < 0 ) {
                        elementsToAdd.push( selectedElement );
                    }
                }

                elementsToAdd.push( endElement );
                elementsToAdd.push( relationElement );
            }
        } );

        if( totalRelationObject > 0 && relationObjectNameSet.length > 0 &&
            relationObjectNameSet.length <= totalRelationObject ) {
            //If partial objects are added then give the message
            if( relationObjectNameSet.length < totalRelationObject ) {
                var noOfObjectsThatCanBeToggleOn = totalRelationObject - relationObjectNameSet.length();
                var eventData = {
                    noOfObjectToggleOn: noOfObjectsThatCanBeToggleOn,
                    totalObjects: totalRelationObject

                };
                eventBus.publish( 'AMGraphEvent.objectsAddedSuccessfully', eventData );
            }
            //If relations are filtered then show the message
            _.forEach( relationObjectNameSet, function( objectString ) {
                var eventData = {
                    filteredObject: objectString
                };
                eventBus.publish( 'AMGraphEvent.filteredType', eventData );
            } );
        }

        if( elementsToAdd.length > 0 ) {
            var eventData2 = {
                userAction: 'AddToDiagram',
                elementsToAdd: elementsToAdd,
                anchorElements: []
            };
            eventBus.publish( 'AMManageDiagramEvent', eventData2 );
        }
    }
};

/**
 * Checks if the object is on diagram accordingly updates or adds to the diagram
 *
 * @param {Object} tracelinkObjects tracelinks objects
 * @param {Object} graphModel graph model
 * @param {Object} startItems start items for tracelink objects
 * @param {Object} endItems end items for tracelink objects
 */
var checkAndAddOrUpdateObjectOnDiagram = function( tracelinkObjects, graphModel, startItems, endItems ) {
    var elementsToAdd = [];
    var elementsToUpdate = [];

    _.forEach( tracelinkObjects, function( curTraceLinkObject ) {
        elementsToAdd.push( curTraceLinkObject );
    } );

    _.forEach( startItems, function( curStartItem ) {
        var foundElement = graphModel.nodeMap[ curStartItem.uid ];
        if( foundElement ) {
            elementsToAdd.push( foundElement.modelObject );
        } else {
            elementsToAdd.push( curStartItem );
            elementsToUpdate.push( curStartItem );
        }
    } );

    _.forEach( endItems, function( curEndItem ) {
        var foundElement = graphModel.nodeMap[ curEndItem.uid ];
        if( foundElement ) {
            elementsToAdd.push( foundElement.modelObject );
        } else {
            elementsToAdd.push( curEndItem );
            elementsToUpdate.push( curEndItem );
        }
    } );

    if( elementsToUpdate.length > 0 ) {
        eventBus.publish( 'AMManageDiagramEvent', {
            elementsToUpdate: elementsToUpdate,
            userAction: 'UpdateDiagram',
            eventName: 'AMGraphEvent.updateDiagramCompleteTriggerAddDiagram',
            eventData: {
                elementsToAdd: elementsToAdd
            }
        } );
    } else {
        if( elementsToAdd.length > 0 ) {
            var anchorNodes = [];
            addObjectsToDiagram( elementsToAdd, anchorNodes, null );
        }
    }
};

/**
 * Adds newly created Tracelinks (start and ends if not on diagram) to the diagram
 *
 * @param {Array} tracelinkObjects : newly created Tracelink objects
 * @param {Object} startItems: start items for Tracelink objects
 * @param {Object} endItems: start items for Tracelink objects
 */
export let addTracelinksToDiagram = function( tracelinkObjects, startItems, endItems ) {
    if( !tracelinkObjects ) {
        return;
    }
    var graphModel = appCtxSvc.ctx.graph.graphModel;
    var propsToLoad = [];
    var uids = [];
    _.forEach( tracelinkObjects, function( curTraceLinkObject ) {
        var primaryObj = curTraceLinkObject.props.primary_object;
        var secondaryObj = curTraceLinkObject.props.secondary_object;

        if( !primaryObj ) {
            propsToLoad.push( 'primary_object' );
        }
        if( !secondaryObj ) {
            propsToLoad.push( 'secondary_object' );
        }

        if( !primaryObj || !secondaryObj ) {
            uids.push( curTraceLinkObject.uid );
        }
    } );

    if( uids.length > 0 ) {
        dms.getProperties( uids, propsToLoad )
            .then(
                function() {
                    checkAndAddOrUpdateObjectOnDiagram( tracelinkObjects, graphModel, startItems, endItems );
                } );
    } else {
        checkAndAddOrUpdateObjectOnDiagram( tracelinkObjects, graphModel, startItems, endItems );
    }
};

/**
 * Validate if new element can be added to diagram, if yes then publish AMGraphEvent.preAddToDiagram event
 *
 * @param {Object} eventData Event information regarding add element
 * @param {Array} createNodeQueue object information stored in queue
 */
export let addElementsToDiagram = function( eventData, createNodeQueue ) {
    if( !eventData.objectToSelect ) {
        return;
    }

    if( eventData.intent === 'DragAndDropIntent' && eventData.deletedObjects ) {
        removeFromDiagramSvc.removeElementsFromDiagram( eventData.deletedObjects );
    }

    var newElementUids = [];
    if( _.isArray( eventData.objectToSelect ) ) {
        newElementUids = eventData.objectToSelect;
    } else {
        newElementUids.push( eventData.objectToSelect );
    }

    var elementsToAdd = [];
    var anchorNodes = [];
    _.forEach( newElementUids, function( newElementUid ) {
        var newElement = cdm.getObject( newElementUid );
        if( !newElement ) {
            return true;
        }
        var parentUid = _.get( newElement, 'props.awb0Parent.dbValues[0]', null );
        var graphModel = appCtxSvc.ctx.graph.graphModel;

        if( newElement.modelType.typeHierarchyArray.indexOf( 'Awb0Interface' ) > -1 ||
            newElement.modelType.typeHierarchyArray.indexOf( 'Awb0Connection' ) > -1 ||
            newElement.modelType.typeHierarchyArray.indexOf( 'Ase0Signal' ) > -1 ) {
            return true;
        }

        if( !graphModel.nodeMap || Object.keys( graphModel.nodeMap ).length === 0 ) {
            elementsToAdd.push( newElement );
            anchorNodes.push( newElement );
        } else if( !graphModel.nodeMap[ newElement.uid ] && parentUid && graphModel.nodeMap[ parentUid ] ||
            createNodeQueue && createNodeQueue.length > 0 && createNodeQueue[ 0 ].isDragCreate ) {
            elementsToAdd.push( newElement );

            // Update child degree for parent nodes
            var parentNode = graphModel.nodeMap[ parentUid ];
            if( parentNode ) {
                ++parentNode.numChildren;
            }
        }

        //Update the architectureCtx with new element
        var architectureCtx = appCtxSvc.getCtx( 'architectureCtx' );
        if( architectureCtx && architectureCtx.archPageData && architectureCtx.archPageData.nodes ) {
            architectureCtx.archPageData.nodes.push( newElement );
        }
    } );
    if( elementsToAdd.length > 0 ) {
        //This case should be executed for drag within when the parent is not visible on diagram
        if( createNodeQueue && createNodeQueue.length > 0 && createNodeQueue[ 0 ].isAnchor ) {
            anchorNodes = elementsToAdd;
        }
        addObjectsToDiagram( elementsToAdd, anchorNodes, createNodeQueue,  null, eventData.deletedObjects);    }
};

/**
 * Adds the Tracelink objects, start and end items to the diagram
 * @param {object} data viewmodel data
 */
export let addTracelinkAndEndsToDiagram = function( data ) {
    var anchorNodes = [];
    var eventData = data.eventData;
    var elementsToAdd = eventData.elementsToAdd;
    addObjectsToDiagram( elementsToAdd, anchorNodes, null );
};

export default exports = {
    toggleOnVisibility,
    addTracelinksToDiagram,
    addElementsToDiagram,
    addTracelinkAndEndsToDiagram
};
app.factory( 'Ase0AddToDiagramService', () => exports );
