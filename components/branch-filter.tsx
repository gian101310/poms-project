export function BranchFilter({
  branches,
  selected,
  includeDate,
  date,
  label = "Branch",
}: {
  branches: any[];
  selected?: string;
  includeDate?: boolean;
  date?: string;
  label?: string;
}) {
  return (
    <form className="flex flex-wrap items-end gap-2">
      {includeDate && (
        <div>
          <label className="label">Date</label>
          <input type="date" name="date" defaultValue={date} className="input !w-auto" />
        </div>
      )}
      <div>
        <label className="label">{label}</label>
        <select name="branch" defaultValue={selected ?? "all"} className="input !w-auto min-w-40">
          <option value="all">All branches</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>
      </div>
      <button className="btn-secondary">Go</button>
    </form>
  );
}
