"""Meta Graph action_type groupings for insights aggregation."""

LINK_CLICK_ACTIONS = frozenset({"link_click", "desktop_canvas_link_click"})
LANDING_ACTIONS = frozenset({"landing_page_view", "omni_landing_page_view"})
POST_ENGAGEMENT_ACTIONS = frozenset(
    {
        "post_engagement",
        "post_reaction",
        "comment",
        "like",
        "post",
        "onsite_conversion.post_save",
    }
)
VIDEO_VIEW_ACTIONS = frozenset({"video_view", "omni_view_content"})
LEAD_ACTION_TYPES = frozenset(
    {
        "lead",
        "leadgen_grouped",
        "onsite_conversion.lead_grouped",
        "offsite_conversion.fb_pixel_lead",
        "onsite_conversion.messaging_conversation_started_7d",
        "complete_registration",
        "submit_application",
    }
)
PURCHASE_ACTION_TYPES = frozenset(
    {
        "purchase",
        "omni_purchase",
        "offsite_conversion.fb_pixel_purchase",
    }
)

MOCK_OBJECTIVES = ["LEAD_GENERATION", "CONVERSIONS", "LINK_CLICKS", "POST_ENGAGEMENT", "REACH"]
MOCK_STATUSES = ["ACTIVE", "ACTIVE", "ACTIVE", "PAUSED", "ACTIVE"]
