# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.conf import settings


def validate_issue_required_fields(data):
    """Return an error dict for ISSUE_REQUIRED_FIELDS missing in data, or None."""
    missing = [field for field in settings.ISSUE_REQUIRED_FIELDS if data.get(field) in (None, "", [])]
    if not missing:
        return None
    return {field: ["This field is required."] for field in missing}
