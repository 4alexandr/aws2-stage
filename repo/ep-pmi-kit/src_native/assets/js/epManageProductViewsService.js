// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 *
 * @module js/epManageProductViewsService
 */

import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import fmsUtils from 'js/fmsUtils';
import soaService from 'soa/kernel/soaService';
import sessionCtxSvc from 'js/sessionContext.service';

'use strict';

const SNAPSHOT_OBJECT_TYPE = 'SnapShotViewData';

/**
 * open in Visualisation
 * This creates a vvi file which can be opened in Standalone Vis application
 *
 */

export function openInVis( datasetsToShow, currentScope ) {
    const objsForVis = [];
    objsForVis.push(currentScope);

    const input = {
        info: [{ occurrencesList: objsForVis }]
    };

   // This selectedPVs is an array of Product views which needs to be included in Standalone vis.
   const selectedPVs = datasetsToShow?datasetsToShow.filter(dataset => dataset.type === SNAPSHOT_OBJECT_TYPE):undefined;

    //Returns the vis context uid of the given dataset
    soaService.post("Visualization-2013-12-StructureManagement", "createVisSCsFromBOMsWithOptions", input)
        .then(function (response) {
            const output = response.output;
            if (output && output.length > 0) {
                const visContext = output[0].structureRecipe;

                const baseUid = visContext.uid;

                const idInfos = {
                    id: null,
                    idAdditionalInfo: {
                        BaseDoc_UID: baseUid,
                        BaseDocTransient: "True"
                    },
                    item: null,
                    itemRev: null,
                    operation: "Open"
                };

                if (selectedPVs === null || selectedPVs === undefined || selectedPVs.length === 0) {
                    idInfos.id = visContext;
                }
                else {
                    idInfos.id = selectedPVs[0];

                    for (const pvIndex of selectedPVs.keys()) {
                        idInfos.idAdditionalInfo.NumSnapshots = (pvIndex + 1).toString();
                        const key = "VisDoc_UID_" + (pvIndex + 1).toString();
                        idInfos.idAdditionalInfo[key] = selectedPVs[pvIndex].uid;
                    }

                }
                const additionaInfo = idInfos;

                createLaunchFile(additionaInfo).then(function (fmsTkt) {
                    const fileName = fmsUtils.getFilenameFromTicket(fmsTkt);
                    fmsUtils.openFile(fmsTkt, fileName);
                });
            }
        });
}

function createLaunchFile (additionalInfo) {
    const serverInfo = _getServerInfo();
    const userAgentInfo = _getUserAgentInfo();

    const sessionDescVal = sessionCtxSvc.getSessionDiscriminator();

    const sessionInfo = {};

    sessionInfo.sessionDescriminator = sessionDescVal;
    sessionInfo.sessionAdditionalInfo = {};
    sessionInfo.sessionAdditionalInfo.CLIENT = 'AW';

    const idInfos = [];

    idInfos.push(additionalInfo);

    const input = {};

    input.idInfos = idInfos;
    input.serverInfo = serverInfo;
    input.userDataAgentInfo = userAgentInfo;
    input.sessionInfo = sessionInfo;

    return soaService.post("Visualization-2011-02-DataManagement", "createLaunchFile", input)
        .then(function (response) {
            return response.ticket;
        });

}

function _getServerInfo() {

    const soaPath = browserUtils.getBaseURL() + 'tc/';
    const protocol = soaPath.substring(0, soaPath.indexOf("://", 0));

    const serverInfo  = {};

    serverInfo.protocol = protocol;
    serverInfo.hostpath = soaPath;
    serverInfo.servermode = 4;

    return serverInfo;
}

function _getUserAgentInfo() {
    const userAgentInfo = {};

    userAgentInfo.userApplication = sessionCtxSvc.getClientID();
    userAgentInfo.userAppVersion = sessionCtxSvc.getClientVersion();

    return userAgentInfo;
}

const exports = {
    openInVis
};

export default exports;
