import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { staffJson, type AttendanceRecord } from "@/lib/hr";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";

/** A GET for a query's queryFn: the data, or throws with a readable message (and goes to sign-in if the session has ended). */
async function hrGet<T>(path: string): Promise<T> {
  const { data, error, unauthorized } = await staffJson<T>(path);
  if (unauthorized) {
    // Hard navigation on purpose: it discards all in-memory state of a session that no longer exists.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/portal/login";
  }
  if (error !== null || data === null) throw new Error(error ?? "No data.");
  return data;
}

/** A write for a mutation's mutationFn: the response, or throws with a readable message. */
async function hrSend<T = unknown>(
  path: string,
  body?: unknown,
): Promise<T | null> {
  const { data, error } = await staffJson<T>(path, "POST", body);
  if (error !== null) throw new Error(error);
  return data;
}

/** The message of a failed query, or null. */
const messageOf = (error: Error | null) => error?.message ?? null;

// ---------------------------------------------------------------- My Leave

export type LeaveRequest = {
  id: string;
  staff_id: string;
  staff_name: string | null;
  staff_role: string | null;
  leave_type: string;
  from_date: string;
  to_date: string;
  is_half_day: boolean;
  days: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  decided_by: number | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
  conflicts?: { role_total: number; role_off: number };
  balance?: LeaveBalance;
};
export type LeaveBalance = {
  year: number;
  allowance: number;
  used: number;
  pending: number;
  remaining: number;
};
export type LeaveForm = {
  leave_type: string;
  from_date: string;
  to_date: string;
  is_half_day: boolean;
  reason: string;
};

export function useMyLeave(canView: boolean) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.hrLeaveMine,
    queryFn: () =>
      hrGet<{
        balance: LeaveBalance;
        requests: LeaveRequest[];
        leave_types: string[];
      }>("/api/portal/leave/mine"),
    enabled: canView,
  });
  const reload = () => qc.invalidateQueries({ queryKey: queryKeys.hrLeave });
  const applyMutation = useMutation({
    mutationFn: (form: LeaveForm) =>
      hrSend<{ over_allowance: boolean }>("/api/portal/leave/mine", form),
    onSuccess: reload,
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => hrSend(`/api/portal/leave/mine/${id}/cancel`),
    onSettled: reload,
  });

  async function apply(form: LeaveForm): Promise<string | null> {
    try {
      const data = await applyMutation.mutateAsync(form);
      toast.success(
        "Leave requested",
        data?.over_allowance
          ? "This goes over your yearly allowance -- a Manager will decide."
          : "A Manager will review it.",
      );
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }

  async function cancel(id: string) {
    try {
      await cancelMutation.mutateAsync(id);
      toast.success("Request withdrawn");
    } catch (e) {
      toast.error("Couldn't withdraw", (e as Error).message);
    }
  }

  return {
    balance: query.data?.balance ?? null,
    requests: query.data?.requests ?? null,
    types: query.data?.leave_types ?? [],
    error: messageOf(query.error),
    apply,
    cancel,
  };
}

// ---------------------------------------------------------------- Leave Requests (review)

export type LeaveSummary = {
  pending: number;
  approved: number;
  rejected: number;
  on_leave_today: number;
};

export function useLeaveRequests(canView: boolean, status: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.hrLeaveRequests(status),
    queryFn: () =>
      hrGet<{
        requests: LeaveRequest[];
        summary: LeaveSummary;
        annual_leave_days: number;
      }>(
        `/api/portal/leave/requests${status ? `?status=${encodeURIComponent(status)}` : ""}`,
      ),
    enabled: canView,
    placeholderData: keepPreviousData,
  });
  const reload = () => qc.invalidateQueries({ queryKey: queryKeys.hrLeave });
  const decideMutation = useMutation({
    mutationFn: (input: {
      id: string;
      action: "approve" | "reject";
      note: string;
    }) =>
      hrSend(`/api/portal/leave/requests/${input.id}/${input.action}`, {
        note: input.note,
      }),
    onSettled: reload, // a refused decision also reloads: the request may have changed under the reviewer
  });
  const allowanceMutation = useMutation({
    mutationFn: (days: number) =>
      hrSend("/api/portal/leave/policy", { annual_leave_days: days }),
    onSuccess: reload,
  });

  async function decide(
    id: string,
    action: "approve" | "reject",
    note: string,
  ): Promise<string | null> {
    try {
      await decideMutation.mutateAsync({ id, action, note });
    } catch (e) {
      return (e as Error).message;
    }
    toast.success(action === "approve" ? "Leave approved" : "Leave declined");
    return null;
  }

  async function saveAllowance(days: number): Promise<string | null> {
    try {
      await allowanceMutation.mutateAsync(days);
    } catch (e) {
      return (e as Error).message;
    }
    toast.success("Yearly allowance updated");
    return null;
  }

  return {
    requests: query.data?.requests ?? null,
    summary: query.data?.summary ?? null,
    allowance: query.data?.annual_leave_days ?? null,
    error: messageOf(query.error),
    decide,
    saveAllowance,
  };
}

// ---------------------------------------------------------------- Clock in / out

export type ClockToday = {
  now: string;
  work_date: string;
  timezone: string;
  state: "not_in" | "in" | "on_break" | "out";
  record: AttendanceRecord | null;
  shift: { start: string | null; end: string | null; source: string };
  location_required: boolean;
  grace_minutes: number;
  on_leave: boolean;
};

/** Best-effort browser location for the clock-in check; resolves to null if refused or unavailable. */
function currentPosition(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation)
      return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  });
}

export function useClock(canView: boolean) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.hrClockToday,
    queryFn: () => hrGet<ClockToday>("/api/portal/attendance/today"),
    enabled: canView,
  });
  const [actError, setActError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const today = query.data ?? null;
  const step = useMutation({
    mutationFn: (input: { path: string; body: unknown }) =>
      hrSend(input.path, input.body),
    // Clocking in or out changes today's state and the month's attendance list.
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.hrAttendance }),
  });

  async function act(path: string, body?: unknown, success?: string) {
    setBusy(true);
    setActError(null);
    try {
      await step.mutateAsync({ path, body: body ?? {} });
      if (success) toast.success(success);
    } catch (e) {
      setActError((e as Error).message);
    }
    setBusy(false);
  }

  async function checkIn() {
    setBusy(true);
    const pos = today?.location_required ? await currentPosition() : null;
    setBusy(false);
    await act("/api/portal/attendance/check-in", pos ?? {}, "Clocked in");
  }

  return {
    today,
    error: actError ?? messageOf(query.error),
    busy,
    reload: () => void query.refetch(),
    checkIn,
    checkOut: () => act("/api/portal/attendance/check-out", {}, "Clocked out"),
    breakStart: () =>
      act("/api/portal/attendance/break/start", {}, "Break started"),
    breakEnd: () => act("/api/portal/attendance/break/end", {}, "Break ended"),
  };
}

// ---------------------------------------------------------------- My attendance

export type MyMonthStats = {
  present_days: number;
  late_days: number;
  absent_days: number;
  leave_days: number;
  working_minutes: number;
  overtime_minutes: number;
  missing_clock_outs: number;
};
/** One day on MY OWN month view -- a leaner row than AttendanceRecord (team view's), since a Leave/Absent
 * day has no underlying attendance row at all: `status` is day_state()'s classifier (on_time/late/
 * missing_clock_out/on_leave/absent/not_in -- never off/upcoming, those days aren't included). */
export type MyMonthRow = {
  work_date: string;
  status: string;
  check_in_local: string | null;
  check_out_local: string | null;
  break_minutes: number;
  working_minutes: number;
  overtime_minutes: number;
};

/** `refreshKey` changes when something the list depends on changed (e.g. the person just clocked out), reloading it. */
export function useMyMonthlyAttendance(
  canView: boolean,
  month: string,
  refreshKey = "",
) {
  const query = useQuery({
    queryKey: queryKeys.hrMyMonth(month, refreshKey),
    queryFn: () =>
      hrGet<{
        records: MyMonthRow[];
        stats: MyMonthStats;
        weekly_trend: { label: string; pct: number }[];
      }>(`/api/portal/attendance/my-summary?month=${month}`),
    enabled: canView,
    placeholderData: keepPreviousData,
  });
  return {
    records: query.data?.records ?? null,
    stats: query.data?.stats ?? null,
    weeklyTrend: query.data?.weekly_trend ?? [],
    error: messageOf(query.error),
  };
}

// ---------------------------------------------------------------- Team attendance (Owner / Manager)

export type OverviewRow = {
  staff_id: string;
  name: string;
  role: string;
  employee_id: string | null;
  state: string;
  shift_start: string | null;
  shift_end: string | null;
  record: AttendanceRecord | null;
};
export type SummaryRow = {
  staff_id: string;
  name: string;
  role: string;
  employee_id: string | null;
  present_days: number;
  late_days: number;
  absent_days: number;
  leave_days: number;
  working_minutes: number;
  overtime_minutes: number;
  missing_clock_outs: number;
};

export function useTeamAttendance(
  canView: boolean,
  date: string,
  month: string,
) {
  const qc = useQueryClient();
  const day = useQuery({
    queryKey: queryKeys.hrTeamDay(date),
    queryFn: () =>
      hrGet<{ rows: OverviewRow[]; counts: Record<string, number> }>(
        `/api/portal/attendance/overview?date=${date}`,
      ),
    enabled: canView,
    placeholderData: keepPreviousData,
  });
  const summary = useQuery({
    queryKey: queryKeys.hrTeamMonth(month),
    queryFn: () =>
      hrGet<{ rows: SummaryRow[] }>(
        `/api/portal/attendance/summary?month=${month}`,
      ),
    enabled: canView,
    placeholderData: keepPreviousData,
  });
  const correction = useMutation({
    mutationFn: (input: { recordId: string; time: string; note: string }) =>
      hrSend(`/api/portal/attendance/${input.recordId}/correct`, {
        check_out_time: input.time,
        note: input.note,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hrAttendance }),
  });

  async function correct(
    recordId: string,
    time: string,
    note: string,
  ): Promise<string | null> {
    try {
      await correction.mutateAsync({ recordId, time, note });
    } catch (e) {
      return (e as Error).message;
    }
    toast.success("Clock-out corrected", "They've been notified.");
    return null;
  }

  return {
    rows: day.data?.rows ?? null,
    counts: day.data?.counts ?? {},
    summary: summary.data?.rows ?? null,
    error: messageOf(day.error) || messageOf(summary.error),
    correct,
  };
}

// ---------------------------------------------------------------- Attendance settings

export type AttendanceSettings = {
  shift_start: string | null;
  shift_end: string | null;
  late_grace_minutes: number;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number | null;
  allowed_ips: string[];
};

export function useAttendanceSettings(canView: boolean) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.hrAttendanceSettings,
    queryFn: () => hrGet<AttendanceSettings>("/api/portal/attendance/settings"),
    enabled: canView,
  });
  const saveMutation = useMutation({
    mutationFn: (next: AttendanceSettings) =>
      hrSend<AttendanceSettings>("/api/portal/attendance/settings", next),
    onSuccess: (saved) => {
      if (saved) qc.setQueryData(queryKeys.hrAttendanceSettings, saved);
      // The shift and location rules decide what "late" and "in range" mean on every attendance screen.
      return qc.invalidateQueries({ queryKey: queryKeys.hrAttendance });
    },
  });

  async function save(next: AttendanceSettings): Promise<string | null> {
    try {
      await saveMutation.mutateAsync(next);
    } catch (e) {
      return (e as Error).message;
    }
    toast.success("Attendance settings saved");
    return null;
  }

  return { settings: query.data ?? null, error: messageOf(query.error), save };
}
