export const parseDatetimeFromFilename = (filename: string): Date | null => {
  const match = filename.match(
    /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T.*(?<hours>\d{2})-(?<minutes>\d{2})/
  );
  if (!match) return null;

  const { year, month, day, hours, minutes } = match.groups ?? {};

  const utcTimeString = `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}T${hours
    .toString()
    .padStart(2, "0")}:${minutes}:00.000`;

  return new Date(utcTimeString);
};
