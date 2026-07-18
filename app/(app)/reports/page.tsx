import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, StatCard, Bar, EmptyState, Badge } from "@/components/ui";
import { BranchFilter } from "@/components/branch-filter";
import { fmtDate, fmtTime, todayStr } from "@/lib/tz";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: { date?: string; branch?: string } }) {
  await requireRole(["super_admin", "manager"]);
  const supabase = createClient();
  const selectedBranch = searchParams.branch && searchParams.branch !== "all" ? searchParams.branch : null;

  let reportsQuery = supabase.from("daily_reports")
    .select("report_date, store_id").order("report_date", { ascending: false }).limit(30);
  if (selectedBranch) reportsQuery = reportsQuery.eq("store_id", selectedBranch);
  const [{ data: reports }, { data: branches }] = await Promise.all([
    reportsQuery,
    supabase.from("stores").select("id, name, code").eq("is_active", true).order("name"),
  ]);

  const selectedDate = searchParams.date ?? reports?.[0]?.report_date ?? todayStr();
  let reportQuery = selectedDate
    ? supabase.from("daily_reports").select("*").eq("report_date", selectedDate)
    : null;
  if (reportQuery && selectedBranch) reportQuery = reportQuery.eq("store_id", selectedBranch);
  let kennelReportsQuery = supabase.from("kennel_reports")
    .select("id, category, submitted_by_name, submitted_at, total_animals, feeding_done, cleaning_done, walking_done, rows, store_id")
    .eq("report_date", selectedDate)
    .order("submitted_at", { ascending: false });
  if (selectedBranch) kennelReportsQuery = kennelReportsQuery.eq("store_id", selectedBranch);
  let shopAnimalReportsQuery = supabase.from("shop_animal_reports")
    .select("id, submitted_by_name, submitted_at, total_animals, feeding_done, cleaning_done, rows, store_id")
    .eq("report_date", selectedDate)
    .order("submitted_at", { ascending: false });
  if (selectedBranch) shopAnimalReportsQuery = shopAnimalReportsQuery.eq("store_id", selectedBranch);
  let kennelInspectionsQuery = supabase.from("kennel_inspections")
    .select("id, category, pet_type, animal_name, cage_number, inspector_name, inspection_shift, feeding_ok, cleaning_ok, walking_ok, status, remarks, action_needed, created_at, store_id")
    .eq("inspection_date", selectedDate)
    .order("created_at", { ascending: false });
  if (selectedBranch) kennelInspectionsQuery = kennelInspectionsQuery.eq("store_id", selectedBranch);
  let shopInspectionsQuery = supabase.from("shop_animal_inspections")
    .select("id, pet_type, animal_name, display_area, cage_number, inspector_name, inspection_shift, feeding_ok, cleaning_ok, status, remarks, action_needed, created_at, store_id")
    .eq("inspection_date", selectedDate)
    .order("created_at", { ascending: false });
  if (selectedBranch) shopInspectionsQuery = shopInspectionsQuery.eq("store_id", selectedBranch);
  let groomingInspectionsQuery = supabase.from("grooming_inspections")
    .select("id, grooming_booking_id, inspector_name, inspection_shift, booking_ok, client_updated_ok, status, remarks, action_needed, created_at, store_id, grooming_bookings(pet_name, pet_type, client_name)")
    .eq("inspection_date", selectedDate)
    .order("created_at", { ascending: false });
  if (selectedBranch) groomingInspectionsQuery = groomingInspectionsQuery.eq("store_id", selectedBranch);
  const [{ data: report }, kennelReportsRes, shopAnimalReportsRes, kennelInspectionsRes, shopInspectionsRes, groomingInspectionsRes] = await Promise.all([
    reportQuery ? reportQuery.maybeSingle() : Promise.resolve({ data: null } as any),
    kennelReportsQuery,
    shopAnimalReportsQuery,
    kennelInspectionsQuery,
    shopInspectionsQuery,
    groomingInspectionsQuery,
  ]);

  const c: any = report?.content;
  const kennelReports = kennelReportsRes.error ? [] : (kennelReportsRes.data ?? []) as any[];
  const shopAnimalReports = shopAnimalReportsRes.error ? [] : (shopAnimalReportsRes.data ?? []) as any[];
  const kennelInspections = [
    ...(kennelInspectionsRes.error ? [] : (kennelInspectionsRes.data ?? []).map((item: any) => ({ ...item, source_type: "boarding" }))),
    ...(shopInspectionsRes.error ? [] : (shopInspectionsRes.data ?? []).map((item: any) => ({ ...item, source_type: "shop", category: "shop_animals", walking_ok: null }))),
    ...(groomingInspectionsRes.error ? [] : (groomingInspectionsRes.data ?? []).map((item: any) => ({
      ...item,
      source_type: "grooming",
      pet_type: item.grooming_bookings?.pet_type ?? "Grooming",
      animal_name: item.grooming_bookings?.pet_name ?? item.grooming_bookings?.client_name,
      display_area: "Grooming",
      cage_number: "",
      feeding_ok: item.booking_ok,
      cleaning_ok: item.client_updated_ok,
      walking_ok: null,
    }))),
  ];
  const kennelTotals = kennelReports.reduce((acc, report) => ({
    animals: acc.animals + Number(report.total_animals ?? 0),
    feeding: acc.feeding + Number(report.feeding_done ?? 0),
    cleaning: acc.cleaning + Number(report.cleaning_done ?? 0),
    walking: acc.walking + Number(report.walking_done ?? 0),
  }), { animals: 0, feeding: 0, cleaning: 0, walking: 0 });
  const shopAnimalTotals = shopAnimalReports.reduce((acc, report) => ({
    animals: acc.animals + Number(report.total_animals ?? 0),
    feeding: acc.feeding + Number(report.feeding_done ?? 0),
    cleaning: acc.cleaning + Number(report.cleaning_done ?? 0),
  }), { animals: 0, feeding: 0, cleaning: 0 });

  return (
    <div>
      <PageHeader title="Daily Reports" subtitle="Delivered by the orchestrator at 22:15 each night"
        action={<BranchFilter branches={branches ?? []} selected={selectedBranch ?? "all"} />} />

      {(reports ?? []).length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {(reports ?? []).map((r: any) => (
            <a key={r.report_date} href={`/reports?date=${r.report_date}${selectedBranch ? `&branch=${selectedBranch}` : ""}`}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${r.report_date === selectedDate
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"}`}>
              {fmtDate(r.report_date)}
            </a>
          ))}
        </div>
      )}

      {!c && kennelReports.length === 0 && shopAnimalReports.length === 0 ? (
        <EmptyState message="No reports yet. The first report is delivered automatically at 22:15 tonight." />
      ) : (
        <div className="space-y-6">
          {c && (
            <div className="card border-l-4 border-l-brand-500 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Highlights</p>
              <ul className="space-y-1">
                {(c.highlights ?? []).map((h: string, i: number) => (
                  <li key={i} className="text-sm">• {h}</li>
                ))}
              </ul>
            </div>
          )}

          {c && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Task Completion" value={c.tasks?.completion_pct != null ? `${c.tasks.completion_pct}%` : "—"}
                hint={`${c.tasks?.completed ?? 0}/${c.tasks?.total ?? 0} tasks`} />
              <StatCard label="Verified" value={c.tasks?.verified ?? 0} />
              <StatCard label="Overdue" value={c.tasks?.overdue ?? 0} />
              <StatCard label="Welfare Records" value={c.welfare_records_today ?? 0} />
              <StatCard label="Present / Late" value={`${c.attendance?.present ?? 0} / ${c.attendance?.late ?? 0}`} />
              <StatCard label="Absent" value={c.attendance?.absent ?? 0} />
              <StatCard label="Overtime Total" value={`${Math.round((c.attendance?.total_overtime_minutes ?? 0) / 60 * 10) / 10}h`} />
              <StatCard label="New Incidents" value={c.incidents?.new_today ?? 0} />
            </div>
          )}

          <section>
            <h2 className="mb-3 text-lg font-semibold">Kennel Reports</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Submissions" value={kennelReports.length} />
              <StatCard label="Animals" value={kennelTotals.animals} />
              <StatCard label="Fed / Cleaned" value={`${kennelTotals.feeding} / ${kennelTotals.cleaning}`} />
              <StatCard label="Walked" value={kennelTotals.walking} />
            </div>
            {kennelReportsRes.error ? (
              <div className="card mt-3 p-4 text-sm text-amber-600">Run migration 019 to enable kennel reports.</div>
            ) : kennelReports.length === 0 ? (
              <div className="card mt-3 p-4 text-sm text-slate-400">No kennel reports submitted for this date.</div>
            ) : (
              <div className="mt-3 space-y-3">
                {kennelReports.map((report: any) => (
                  <details key={report.id} className="card p-4">
                    <summary className="cursor-pointer">
                      <span className="font-medium capitalize">{String(report.category).replace(/_/g, " ")}</span>
                      <span className="text-sm text-slate-400"> · {report.submitted_by_name} · {fmtTime(report.submitted_at)}</span>
                    </summary>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[1200px] text-sm">
                        <thead>
                          <tr>
                            {["Boarding", "Pet", "Client", "Received by", "Dates", "Days", "Payment", "Invoices", "Extension", "Breed / type", "Cage", "Health", "Care", "Misc / Updated", "Report"].map((h) => <th key={h} className="th">{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {(report.rows ?? []).map((row: any, index: number) => (
                            <tr key={`${report.id}-${index}`} className="table-row">
                              <td className="td">{row.label ?? `Boarding ${index + 1}`}</td>
                              <td className="td">{row.animal_name || "—"} <span className="text-xs text-slate-400">({row.pet_type})</span></td>
                              <td className="td">{row.client_number || "—"}</td>
                              <td className="td text-xs">{row.received_by || "—"}</td>
                              <td className="td">{row.check_in_date || "—"} to {row.checkout_date || "—"}</td>
                              <td className="td text-xs">{row.boarding_days ?? 0} total · {row.paid_days ?? 0} paid · {row.overdue_days ?? 0} overdue</td>
                              <td className="td capitalize">{row.payment_status || "unpaid"}</td>
                              <td className="td text-xs">{row.invoice_numbers || "—"}</td>
                              <td className="td text-xs">
                                {row.extension_checkout_date ? `${row.extension_checkout_date} · ${row.extension_days ?? 0} day(s) · ${row.extension_payment_status || "unpaid"}${row.extension_invoice_numbers ? ` · ${row.extension_invoice_numbers}` : ""}` : "—"}
                              </td>
                              <td className="td">{row.breed || "—"}</td>
                              <td className="td">{[row.cage_color, row.cage_number].filter(Boolean).join(" / ") || "—"}</td>
                              <td className="td">{row.health_status || "—"}</td>
                              <td className="td text-xs">
                                Feeding {row.feeding_done ? "done" : "pending"} · Cleaning {row.cleaning_done ? "done" : "pending"}
                                {row.pet_type === "Dog" ? ` · Walking ${row.walking_done ? "done" : "pending"}` : ""}
                              </td>
                              <td className="td text-xs">
                                {row.misc_note || "—"}
                                {row.brought_items ? ` · Items: ${[
                                  row.brought_items.cage ? "cage" : "",
                                  row.brought_items.food ? "food" : "",
                                  row.brought_items.toys ? "toys" : "",
                                  row.brought_items.bed ? "bed" : "",
                                  row.brought_items.medicine ? "medicine" : "",
                                  row.brought_items.other ? "other" : "",
                                ].filter(Boolean).join(", ") || "none"}${row.brought_items.note ? ` (${row.brought_items.note})` : ""}` : ""}
                                {row.last_updated_by ? ` · Updated by ${row.last_updated_by}` : ""}
                              </td>
                              <td className="td">{row.report || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Shop Animal Reports</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Submissions" value={shopAnimalReports.length} />
              <StatCard label="Animals" value={shopAnimalTotals.animals} />
              <StatCard label="Fed" value={shopAnimalTotals.feeding} />
              <StatCard label="Cleaned" value={shopAnimalTotals.cleaning} />
            </div>
            {shopAnimalReportsRes.error ? (
              <div className="card mt-3 p-4 text-sm text-amber-600">Run migration 021 to enable shop animal reports.</div>
            ) : shopAnimalReports.length === 0 ? (
              <div className="card mt-3 p-4 text-sm text-slate-400">No shop animal reports submitted for this date.</div>
            ) : (
              <div className="mt-3 space-y-3">
                {shopAnimalReports.map((report: any) => (
                  <details key={report.id} className="card p-4">
                    <summary className="cursor-pointer">
                      <span className="font-medium">Shop animals</span>
                      <span className="text-sm text-slate-400"> · {report.submitted_by_name} · {fmtTime(report.submitted_at)}</span>
                    </summary>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[780px] text-sm">
                        <thead>
                          <tr>
                            {["Animal", "Category", "Pet", "Qty", "Area", "Cage", "Health", "Care", "Report"].map((h) => <th key={h} className="th">{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {(report.rows ?? []).map((row: any, index: number) => (
                            <tr key={`${report.id}-${index}`} className="table-row">
                              <td className="td">{row.label ?? `Shop Animal ${index + 1}`}</td>
                              <td className="td capitalize">{String(row.shop_category ?? "shop_animals").replace(/_/g, " ")}</td>
                              <td className="td">{row.animal_name || "—"} <span className="text-xs text-slate-400">({row.pet_type}{row.breed ? ` · ${row.breed}` : ""})</span></td>
                              <td className="td">{row.quantity ?? 1}</td>
                              <td className="td">{row.display_area || "—"}</td>
                              <td className="td">{[row.cage_color, row.cage_number].filter(Boolean).join(" / ") || "—"}</td>
                              <td className="td">{row.health_status || "—"}</td>
                              <td className="td text-xs">Feeding {row.feeding_done ? "done" : "pending"} · Cleaning {row.cleaning_done ? "done" : "pending"}</td>
                              <td className="td">{row.report || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Kennel Inspections</h2>
            {kennelInspectionsRes.error || shopInspectionsRes.error || groomingInspectionsRes.error ? (
              <div className="card p-4 text-sm text-amber-600">Run migrations 020, 021, and 022 to enable all inspection reports.</div>
            ) : kennelInspections.length === 0 ? (
              <div className="card p-4 text-sm text-slate-400">No admin inspections submitted for this date.</div>
            ) : (
              <div className="card overflow-x-auto p-0">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr>
                      {["Time", "Source", "Shift", "Inspector", "Pet", "Location", "Checks", "Status", "Remarks", "Needs"].map((h) => <th key={h} className="th">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {kennelInspections.map((item: any) => (
                      <tr key={item.id} className="table-row">
                        <td className="td">{fmtTime(item.created_at)}</td>
                        <td className="td capitalize">{String(item.source_type).replace(/_/g, " ")}</td>
                        <td className="td">{item.inspection_shift}</td>
                        <td className="td">{item.inspector_name}</td>
                        <td className="td">{item.animal_name || "—"} <span className="text-xs text-slate-400">({item.pet_type})</span></td>
                        <td className="td">{[item.display_area, item.cage_number].filter(Boolean).join(" / ") || "—"}</td>
                        <td className="td text-xs">
                          Feeding {item.feeding_ok ? "ok" : "missed"} · Cleaning {item.cleaning_ok ? "ok" : "missed"}
                          {item.pet_type === "Dog" ? ` · Walking ${item.walking_ok ? "ok" : "missed"}` : ""}
                        </td>
                        <td className="td"><Badge value={item.status} /></td>
                        <td className="td">{item.remarks || "—"}</td>
                        <td className="td">{item.action_needed || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {c && (c.departments ?? []).length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Departments</h2>
              <div className="card space-y-3 p-4">
                {c.departments.map((d: any) => (
                  <div key={d.name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium">{d.name}</span>
                      <span className="text-slate-500">{d.pct}% ({d.done}/{d.total})</span>
                    </div>
                    <Bar pct={d.pct} color={d.pct >= 80 ? "bg-green-500" : d.pct >= 50 ? "bg-amber-500" : "bg-red-500"} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {c && <div className="grid gap-6 md:grid-cols-2">
            {(c.unfinished_by ?? []).length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold">Unfinished Tasks</h2>
                <div className="card divide-y divide-slate-100 p-0 dark:divide-slate-800">
                  {c.unfinished_by.map((u: any, i: number) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm">{u.name} <span className="text-xs text-slate-400">({u.code})</span></span>
                      <Badge value="pending" />
                    </div>
                  ))}
                </div>
              </section>
            )}
            <section>
              <h2 className="mb-3 text-lg font-semibold">Handovers</h2>
              <div className="card p-4 text-sm">
                <p>{c.handovers?.submitted ?? 0} submitted · {c.handovers?.approved ?? 0} approved</p>
                {(c.handovers?.still_draft ?? []).length > 0 && (
                  <p className="mt-2 text-amber-600">Not submitted: {c.handovers.still_draft.join(", ")}</p>
                )}
                {(c.attendance?.flagged_clockins ?? []).length > 0 && (
                  <p className="mt-2 text-red-600">⚠ Off-site clock-ins: {c.attendance.flagged_clockins.join(", ")}</p>
                )}
              </div>
            </section>
          </div>}
        </div>
      )}
    </div>
  );
}
