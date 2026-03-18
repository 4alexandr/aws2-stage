#!/bin/ksh
# Copyright 2019 Siemens Product Lifecycle Management Software Inc.
################################################################################
# Note:
#  This script is called by the installer to produce the Active Workspace site.
#  The use of this script and any other artifacts during the Active Workspace site
 #  creation is subject to change.
################################################################################
SCRIPTDIR=`dirname $0`                  # The dir containing this script.
SCRIPTDIR=`cd ${SCRIPTDIR}; pwd`        # Convert it to an absolute path -
cd ${SCRIPTDIR}

# Build bundles by default
DRAFT=false
npm run build && npm run publish
