import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Polygon, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useMemo } from 'react';
import { useTheme } from '../src/theme';
import { useTranslation } from '../src/i18n';
import { formatCurrencyShort } from '../src/utils/formatters';
import type { IncomeDataPoint } from '../src/types';

interface IncomeChartProps {
  data: IncomeDataPoint[];
}

const H = 200;
const PL = 30;
const PR = 6;
const PT = 16;
const PB = 22;

export default function IncomeChart({ data }: IncomeChartProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: { marginTop: 10 },
    empty: { textAlign: 'center', fontSize: 14, color: colors.textSecondary, paddingVertical: 20 },
    legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 6 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendLine: { width: 14, height: 2, borderRadius: 1 },
    legendLabel: { fontSize: 11, color: colors.textSecondary },
  }), [colors]);

  const { incomeLine, incomeArea, earningsLine, points, yLabels, xLabels } = useMemo(() => {
    if (data.length === 0) return { incomeLine: '', incomeArea: '', earningsLine: '', points: [], yLabels: [], xLabels: [] };

    const w = 320;
    const drawW = w - PL - PR;
    const drawH = H - PT - PB;
    const max = Math.max(...data.map(d => d.amount), 1);
    const stepX = drawW / (data.length - 1 || 1);

    const pts = data.map((d, i) => ({
      x: PL + i * stepX,
      y: PT + drawH - (d.amount / max) * drawH,
      ey: PT + drawH - (d.earnings / max) * drawH,
      amount: d.amount,
      earnings: d.earnings,
      label: d.label,
    }));

    const iLine = pts.map(p => `${p.x},${p.y}`).join(' ');
    const eLine = pts.map(p => `${p.x},${p.ey}`).join(' ');
    const baseY = PT + drawH;
    const iArea = `${pts[0].x},${baseY} ${pts.map(p => `${p.x},${p.y}`).join(' ')} ${pts[pts.length - 1].x},${baseY}`;

    const yLbls = [
      { value: max, y: PT },
      { value: Math.round(max / 2), y: PT + drawH / 2 },
      { value: 0, y: PT + drawH },
    ];

    const step = Math.max(1, Math.floor(pts.length / 8));
    const xLbls = pts.map((p, i) => ({
      label: p.label,
      x: p.x,
      show: i === 0 || i === pts.length - 1 || i % step === 0,
    }));

    return { incomeLine: iLine, incomeArea: iArea, earningsLine: eLine, points: pts, yLabels: yLbls, xLabels: xLbls };
  }, [data]);

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>No data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Svg width="100%" height={H} viewBox={`0 0 320 ${H}`}>
        <Defs>
          <LinearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.25" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0.02" />
          </LinearGradient>

        </Defs>

        {yLabels.map((yl, i) => (
          <SvgText
            key={`y${i}`}
            x={PL - 6}
            y={yl.y + 4}
            fill={colors.textTertiary}
            fontSize={10}
            textAnchor="end"
          >
            {formatCurrencyShort(yl.value)}
          </SvgText>
        ))}

        {xLabels.filter(xl => xl.show).map((xl, i) => (
          <SvgText
            key={`x${i}`}
            x={xl.x}
            y={H - 4}
            fill={colors.textTertiary}
            fontSize={10}
            textAnchor="middle"
          >
            {xl.label}
          </SvgText>
        ))}

        {points.map((p, i) => (
          <SvgText
            key={`v${i}`}
            x={p.x}
            y={p.y - 8}
            fill={colors.primary}
            fontSize={10}
            fontWeight="600"
            textAnchor="middle"
          >
            {formatCurrencyShort(p.amount)}
          </SvgText>
        ))}

        {points.map((p, i) => (
          <SvgText
            key={`ev${i}`}
            x={p.x}
            y={p.ey - 8}
            fill={colors.success}
            fontSize={9}
            fontWeight="600"
            textAnchor="middle"
          >
            {formatCurrencyShort(p.earnings)}
          </SvgText>
        ))}

        <Polygon points={incomeArea} fill="url(#incomeGrad)" />
        <Polyline points={incomeLine} fill="none" stroke={colors.primary} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        <Polyline points={earningsLine} fill="none" stroke={colors.success} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="4,3" />

        {points.map((p, i) => (
          <Circle key={`i${i}`} cx={p.x} cy={p.y} r="3" fill={colors.card} stroke={colors.primary} strokeWidth="2" />
        ))}

        {points.map((p, i) => (
          <Circle key={`e${i}`} cx={p.x} cy={p.ey} r="2.5" fill={colors.card} stroke={colors.success} strokeWidth="1.5" />
        ))}
      </Svg>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendLabel}>{t('dashboard.totalPaidOut')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.success }]} />
          <Text style={styles.legendLabel}>{t('dashboard.realEarnings')}</Text>
        </View>
      </View>
    </View>
  );
}