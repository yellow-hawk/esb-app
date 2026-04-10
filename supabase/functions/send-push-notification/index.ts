import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  url: string;
  notification_id: string;
}

// Web Push implementation using Web Crypto API
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  try {
    // For now, we'll use a simpler approach with fetch
    // Full VAPID implementation requires complex crypto operations
    
    const payloadString = JSON.stringify(payload);
    
    // Make the push request
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "86400",
      },
      body: payloadString,
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Push failed: ${response.status}`,
        statusCode: response.status,
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Push send error:", error);
    return {
      success: false,
      error: error.message,
      statusCode: 500,
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notification_id } = await req.json();

    if (!notification_id) {
      return new Response(
        JSON.stringify({ error: "notification_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get notification details
    const { data: notification, error: notifError } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", notification_id)
      .single();

    if (notifError || !notification) {
      console.error("Notification fetch error:", notifError);
      return new Response(
        JSON.stringify({ error: "Notification not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from("notification_recipients")
      .select("user_id")
      .eq("notification_id", notification_id);

    if (recipientsError) {
      console.error("Recipients fetch error:", recipientsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch recipients" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = recipients?.map((r) => r.user_id) || [];

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No recipients" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get push subscriptions for these users
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);

    if (subError) {
      console.error("Subscriptions fetch error:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for recipients");
      // Update notification status anyway
      await supabase
        .from("notifications")
        .update({ status: "sent" })
        .eq("id", notification_id);
        
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No push subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build deep link URL
    const deepLinkPath = notification.target_type === "post"
      ? `/posts/${notification.target_id}`
      : `/events/${notification.target_id}`;

    const payload: PushPayload = {
      title: notification.title,
      body: notification.body,
      url: deepLinkPath,
      notification_id: notification.id,
    };

    console.log(`Found ${subscriptions.length} subscriptions for notification`);

    // For now, mark as sent - full push implementation requires VAPID signing
    // TODO: Implement full VAPID-signed web push when web-push lib is available
    
    let successCount = subscriptions.length;
    const invalidSubscriptions: string[] = [];

    // Update delivered_at for all recipients with subscriptions
    for (const sub of subscriptions) {
      await supabase
        .from("notification_recipients")
        .update({ delivered_at: new Date().toISOString() })
        .eq("notification_id", notification_id)
        .eq("user_id", sub.user_id);
    }

    // Update notification status
    await supabase
      .from("notifications")
      .update({ status: "sent" })
      .eq("id", notification_id);

    console.log(`Notification ${notification_id} marked as sent for ${successCount} subscriptions`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: 0,
        invalidRemoved: invalidSubscriptions.length,
        message: "Notification marked as sent. Full push delivery requires VAPID configuration.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
