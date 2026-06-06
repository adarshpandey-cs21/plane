# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("db", "0122_cycle_completed_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="issue",
            name="qa_assignee",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="qa_assigned_issues",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
