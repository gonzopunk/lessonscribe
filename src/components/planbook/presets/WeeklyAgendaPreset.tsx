import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { addDays, format } from "date-fns";

export interface WeeklyAgendaPresetProps {
  weekMonday: Date;
  fields: Record<string, string>;
}

const RULE = "#e5e7eb";
const GRAY = "#6b7280";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: "#000", backgroundColor: "#fff", fontFamily: "Helvetica" },
  headerTitle: { fontSize: 20, fontWeight: 700 },
  dateRange: { fontSize: 9, color: GRAY, marginTop: 2 },
  objective: { fontSize: 10, marginTop: 6 },
  hr: { borderBottomWidth: 1, borderBottomColor: RULE, marginVertical: 8 },
  daySection: { marginTop: 8 },
  dayHeader: { backgroundColor: RULE, padding: 4, fontWeight: 700, fontSize: 11 },
  dayBody: { paddingHorizontal: 4, paddingTop: 4 },
  row: { marginTop: 2, flexDirection: "row" },
  label: { fontWeight: 700 },
  italicGray: { fontStyle: "italic", color: GRAY, marginTop: 2 },
  activitiesList: { marginTop: 2 },
  activityItem: { marginTop: 1 },
  dayDivider: { borderBottomWidth: 1, borderBottomColor: RULE, marginTop: 6 },
  footer: { marginTop: 12 },
  footerLine: { marginTop: 4 },
  p2Header: { fontSize: 12, fontWeight: 700 },
  nameRow: { marginTop: 10, fontSize: 11 },
  noteLine: { borderBottomWidth: 1, borderBottomColor: RULE, height: 22 },
});

const DAYS: Array<{ sfx: string }> = [
  { sfx: "mon" },
  { sfx: "tue" },
  { sfx: "wed" },
  { sfx: "thu" },
  { sfx: "fri" },
];

export function WeeklyAgendaPreset({ weekMonday, fields }: WeeklyAgendaPresetProps) {
  const dateRange = `${format(weekMonday, "MMM d")} – ${format(addDays(weekMonday, 4), "MMM d, yyyy")}`;
  const f = (k: string) => fields[k] ?? "";
  const dash = (v: string) => (v && v.trim() ? v : "—");

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View>
          <Text style={styles.headerTitle}>{f("week_header") || "Weekly Agenda"}</Text>
          <Text style={styles.dateRange}>{dateRange}</Text>
          <Text style={styles.objective}>Objective: {dash(f("weekly_objective"))}</Text>
        </View>
        <View style={styles.hr} />

        {DAYS.map(({ sfx }) => {
          const activities = f(`activities_${sfx}`)
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          return (
            <View key={sfx} style={styles.daySection} wrap={false}>
              <Text style={styles.dayHeader}>{dash(f(`date_${sfx}`))}</Text>
              <View style={styles.dayBody}>
                <Text style={styles.row}>
                  <Text style={styles.label}>Word of the Day: </Text>
                  <Text style={styles.label}>{dash(f(`word_${sfx}`))}</Text>
                </Text>
                <Text style={styles.italicGray}>7-min Quick Write</Text>
                <View style={styles.activitiesList}>
                  {activities.length === 0 ? (
                    <Text style={styles.activityItem}>—</Text>
                  ) : (
                    activities.map((a, i) => (
                      <Text key={i} style={styles.activityItem}>
                        □ {a}
                      </Text>
                    ))
                  )}
                </View>
                <Text style={styles.row}>
                  <Text style={styles.label}>Exit Ticket: </Text>
                  <Text>{dash(f(`exit_${sfx}`))}</Text>
                </Text>
              </View>
              <View style={styles.dayDivider} />
            </View>
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.footerLine}>
            <Text style={styles.label}>Tip of the Week: </Text>
            <Text>{dash(f("tip_week"))}</Text>
          </Text>
          {[1, 2, 3].map((n) => (
            <Text key={n} style={styles.footerLine}>
              <Text style={styles.label}>Reflection {n}: </Text>
              <Text>{dash(f(`reflection_${n}`))}</Text>
            </Text>
          ))}
        </View>
      </Page>

      <Page size="LETTER" style={styles.page}>
        <Text style={styles.p2Header}>{dateRange}</Text>
        <View style={styles.hr} />
        <Text style={styles.nameRow}>Name: _______________________________   Date: _______________</Text>
        <View style={{ marginTop: 16 }}>
          {Array.from({ length: 18 }).map((_, i) => (
            <View key={i} style={styles.noteLine} />
          ))}
        </View>
      </Page>
    </Document>
  );
}
