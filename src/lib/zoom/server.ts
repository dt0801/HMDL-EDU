const ZOOM_OAUTH_URL = "https://zoom.us/oauth/token";
const ZOOM_API_BASE_URL = "https://api.zoom.us/v2";

type ZoomTokenResponse = {
  access_token: string;
};

type ZoomMeetingPayload = {
  topic: string;
  agenda?: string;
  start_time: string;
  duration: number;
  timezone: string;
};

export type ZoomMeetingResponse = {
  id: string | number;
  join_url: string;
  start_url?: string;
};

export class ZoomApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ZoomApiError";
    this.status = status;
  }
}

function getZoomConfig() {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  const hostUserId = process.env.ZOOM_HOST_USER_ID;

  if (!accountId || !clientId || !clientSecret || !hostUserId) {
    throw new Error(
      "Thiếu cấu hình Zoom trên server. Cần ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET và ZOOM_HOST_USER_ID."
    );
  }

  return { accountId, clientId, clientSecret, hostUserId };
}

async function getZoomAccessToken() {
  const { accountId, clientId, clientSecret } = getZoomConfig();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const url = new URL(ZOOM_OAUTH_URL);
  url.searchParams.set("grant_type", "account_credentials");
  url.searchParams.set("account_id", accountId);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new ZoomApiError(message || "Không lấy được access token Zoom.", response.status);
  }

  const data = (await response.json()) as ZoomTokenResponse;
  return data.access_token;
}

async function zoomRequest<T>(path: string, init?: RequestInit) {
  const token = await getZoomAccessToken();
  const response = await fetch(`${ZOOM_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = "Zoom API request failed.";
    try {
      const payload = (await response.json()) as { message?: string };
      message = payload.message ?? message;
    } catch {
      message = await response.text();
    }
    throw new ZoomApiError(message, response.status);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export async function createZoomMeeting(payload: ZoomMeetingPayload) {
  const { hostUserId } = getZoomConfig();
  return zoomRequest<ZoomMeetingResponse>(`/users/${encodeURIComponent(hostUserId)}/meetings`, {
    method: "POST",
    body: JSON.stringify({
      topic: payload.topic,
      agenda: payload.agenda,
      type: 2,
      start_time: payload.start_time,
      duration: payload.duration,
      timezone: payload.timezone,
      settings: {
        join_before_host: false,
        waiting_room: true,
      },
    }),
  });
}

export async function updateZoomMeeting(
  meetingId: string,
  payload: ZoomMeetingPayload
) {
  await zoomRequest<null>(`/meetings/${encodeURIComponent(meetingId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      topic: payload.topic,
      agenda: payload.agenda,
      start_time: payload.start_time,
      duration: payload.duration,
      timezone: payload.timezone,
      settings: {
        join_before_host: false,
        waiting_room: true,
      },
    }),
  });
}

export async function deleteZoomMeeting(meetingId: string) {
  await zoomRequest<null>(`/meetings/${encodeURIComponent(meetingId)}`, {
    method: "DELETE",
  });
}
