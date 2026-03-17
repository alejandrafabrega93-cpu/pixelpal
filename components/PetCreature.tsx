import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Ellipse,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { PetMood, PetSpecies, PetStage } from "@/context/PetContext";
import { Colors } from "@/constants/colors";

interface PetCreatureProps {
  species: PetSpecies;
  stage: PetStage;
  mood: PetMood;
  size?: number;
  eggTaps?: number;
  eggTapsToHatch?: number;
  equippedItems?: Record<string, string>;
}

function EggCreature({
  size,
  mood,
  eggTaps = 0,
  eggTapsToHatch = 10,
}: {
  size: number;
  mood: PetMood;
  eggTaps?: number;
  eggTapsToHatch?: number;
}) {
  const s = size;
  const cx = s * 0.5;
  const cy = s * 0.5;
  const rx = s * 0.28;
  const ry = s * 0.34;
  const progress = Math.min(eggTaps / eggTapsToHatch, 1);

  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Ellipse
        cx={cx}
        cy={cy + ry * 0.1}
        rx={rx * 1.3}
        ry={ry * 1.2}
        fill={Colors.primary + "10"}
      />
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#1E3555" />
      <Ellipse cx={cx} cy={cy} rx={rx * 0.9} ry={ry * 0.9} fill="#243E68" />
      <Circle cx={cx - rx * 0.35} cy={cy - ry * 0.22} r={s * 0.022} fill={Colors.primary + "55"} />
      <Circle cx={cx + rx * 0.3} cy={cy + ry * 0.18} r={s * 0.016} fill={Colors.primary + "44"} />
      <Circle cx={cx + rx * 0.5} cy={cy - ry * 0.1} r={s * 0.014} fill={Colors.accent + "55"} />
      <Circle cx={cx - rx * 0.15} cy={cy + ry * 0.38} r={s * 0.012} fill={Colors.primary + "44"} />
      {progress >= 0.3 && (
        <Path
          d={`M ${cx} ${cy - ry * 0.3} L ${cx - s * 0.03} ${cy - ry * 0.05} L ${cx + s * 0.015} ${cy + ry * 0.05}`}
          stroke={Colors.primary + "CC"}
          strokeWidth={s * 0.012}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {progress >= 0.5 && (
        <Path
          d={`M ${cx - rx * 0.25} ${cy - ry * 0.1} L ${cx - rx * 0.05} ${cy + ry * 0.1} L ${cx - rx * 0.2} ${cy + ry * 0.25}`}
          stroke={Colors.primary + "AA"}
          strokeWidth={s * 0.011}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {progress >= 0.7 && (
        <>
          <Path
            d={`M ${cx + rx * 0.1} ${cy - ry * 0.2} L ${cx + rx * 0.35} ${cy + ry * 0.05}`}
            stroke={Colors.primary + "BB"}
            strokeWidth={s * 0.012}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d={`M ${cx - rx * 0.05} ${cy + ry * 0.15} L ${cx + rx * 0.2} ${cy + ry * 0.35}`}
            stroke={Colors.accent + "99"}
            strokeWidth={s * 0.01}
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}
      {progress >= 0.9 && (
        <Ellipse
          cx={cx}
          cy={cy}
          rx={rx * 1.05}
          ry={ry * 1.05}
          fill="none"
          stroke={Colors.primary + "88"}
          strokeWidth={s * 0.018}
        />
      )}
      <Ellipse
        cx={cx - rx * 0.3}
        cy={cy - ry * 0.3}
        rx={rx * 0.22}
        ry={ry * 0.18}
        fill="rgba(255,255,255,0.1)"
      />
      {progress > 0 && progress < 1 && (
        <SvgText
          x={cx}
          y={cy + ry + s * 0.12}
          fontSize={s * 0.11}
          fill={Colors.primary}
          textAnchor="middle"
          fontWeight="bold"
        >
          {eggTaps}/{eggTapsToHatch}
        </SvgText>
      )}
    </Svg>
  );
}

function GlorpCreature({
  size,
  stage,
  mood,
}: {
  size: number;
  stage: PetStage;
  mood: PetMood;
}) {
  const s = size;
  const bodyScale =
    stage === "baby" ? 0.7 : stage === "child" ? 0.82 : stage === "teen" ? 0.91 : 1;
  const bs = s * bodyScale;
  const offsetY = (s - bs) / 2 + s * 0.05;
  const cx = s * 0.5;
  const cy = offsetY + bs * 0.52;
  const rx = bs * 0.38;
  const ry = bs * 0.4;
  const eyeY = cy - ry * 0.25;
  const eyeGap = rx * 0.55;
  const isSick = mood === "sick";
  const isSleeping = mood === "sleeping";
  const isSad = mood === "sad";
  const isHappy = mood === "happy" || mood === "ecstatic";

  const isElder = stage === "elder";
  const bodyColor = isSick ? "#2A3A50" : "#1E3A5F";
  const skinColor = isSick ? "#344D6A" : "#243A60";

  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      {stage !== "baby" && (
        <>
          <Ellipse cx={cx - rx * 0.8} cy={cy + ry * 0.5} rx={rx * 0.18} ry={ry * 0.45} fill={skinColor} opacity={0.7} />
          <Ellipse cx={cx + rx * 0.8} cy={cy + ry * 0.5} rx={rx * 0.18} ry={ry * 0.45} fill={skinColor} opacity={0.7} />
        </>
      )}
      <Ellipse cx={cx - rx * 0.5} cy={cy + ry * 0.85} rx={rx * 0.22} ry={rx * 0.12} fill={bodyColor} opacity={0.8} />
      <Ellipse cx={cx + rx * 0.5} cy={cy + ry * 0.85} rx={rx * 0.22} ry={rx * 0.12} fill={bodyColor} opacity={0.8} />
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={bodyColor} />
      <Ellipse cx={cx} cy={cy} rx={rx * 0.9} ry={ry * 0.88} fill={skinColor} />
      <Ellipse cx={cx - rx * 0.28} cy={cy - ry * 0.3} rx={rx * 0.2} ry={ry * 0.25} fill="rgba(255,255,255,0.08)" />
      {isElder && (
        <Ellipse cx={cx} cy={cy} rx={rx * 0.9} ry={ry * 0.88} fill="#888888" opacity={0.15} />
      )}
      {!isSleeping ? (
        <>
          <Circle cx={cx - eyeGap} cy={eyeY} r={rx * 0.2} fill={Colors.bg} />
          <Circle cx={cx + eyeGap} cy={eyeY} r={rx * 0.2} fill={Colors.bg} />
          <Circle cx={cx - eyeGap} cy={eyeY} r={rx * 0.13} fill={isSick ? Colors.danger : Colors.primary} />
          <Circle cx={cx + eyeGap} cy={eyeY} r={rx * 0.13} fill={isSick ? Colors.danger : Colors.primary} />
          <Circle cx={cx - eyeGap + rx * 0.04} cy={eyeY - rx * 0.04} r={rx * 0.05} fill="rgba(255,255,255,0.9)" />
          <Circle cx={cx + eyeGap + rx * 0.04} cy={eyeY - rx * 0.04} r={rx * 0.05} fill="rgba(255,255,255,0.9)" />
        </>
      ) : (
        <>
          <Path d={`M ${cx - eyeGap - rx * 0.14} ${eyeY} Q ${cx - eyeGap} ${eyeY + rx * 0.12} ${cx - eyeGap + rx * 0.14} ${eyeY}`} stroke={Colors.textSecondary} strokeWidth={rx * 0.06} fill="none" strokeLinecap="round" />
          <Path d={`M ${cx + eyeGap - rx * 0.14} ${eyeY} Q ${cx + eyeGap} ${eyeY + rx * 0.12} ${cx + eyeGap + rx * 0.14} ${eyeY}`} stroke={Colors.textSecondary} strokeWidth={rx * 0.06} fill="none" strokeLinecap="round" />
        </>
      )}
      {isHappy && !isSleeping && (
        <Path d={`M ${cx - rx * 0.25} ${cy + ry * 0.25} Q ${cx} ${cy + ry * 0.4} ${cx + rx * 0.25} ${cy + ry * 0.25}`} stroke={Colors.primary} strokeWidth={rx * 0.07} fill="none" strokeLinecap="round" />
      )}
      {isSad && !isSleeping && (
        <Path d={`M ${cx - rx * 0.25} ${cy + ry * 0.38} Q ${cx} ${cy + ry * 0.28} ${cx + rx * 0.25} ${cy + ry * 0.38}`} stroke={Colors.textSecondary} strokeWidth={rx * 0.07} fill="none" strokeLinecap="round" />
      )}
      {isSick && (
        <SvgText x={cx + rx * 0.5} y={cy - ry * 0.7} fontSize={rx * 0.3} fill={Colors.danger} textAnchor="middle">!</SvgText>
      )}
      {isElder && !isSleeping && (
        <>
          <SvgText x={cx - eyeGap} y={eyeY + rx * 0.38} fontSize={rx * 0.28} fill="#aaaaaa" textAnchor="middle">~</SvgText>
          <SvgText x={cx + eyeGap} y={eyeY + rx * 0.38} fontSize={rx * 0.28} fill="#aaaaaa" textAnchor="middle">~</SvgText>
        </>
      )}
      {mood === "ecstatic" && (
        <>
          <Circle cx={cx - rx * 1.1} cy={cy - ry * 0.6} r={rx * 0.08} fill={Colors.primary} opacity={0.8} />
          <Circle cx={cx + rx * 1.1} cy={cy - ry * 0.4} r={rx * 0.06} fill={Colors.accent} opacity={0.8} />
          <Circle cx={cx} cy={cy - ry * 1.1} r={rx * 0.07} fill={Colors.primary} opacity={0.6} />
        </>
      )}
      {isSleeping && (
        <>
          <SvgText x={cx + rx * 0.8} y={cy - ry * 0.6} fontSize={rx * 0.35} fill={Colors.info} opacity={0.8}>z</SvgText>
          <SvgText x={cx + rx * 1.05} y={cy - ry * 0.9} fontSize={rx * 0.25} fill={Colors.info} opacity={0.6}>z</SvgText>
        </>
      )}
    </Svg>
  );
}

function ZippixCreature({ size, stage, mood }: { size: number; stage: PetStage; mood: PetMood }) {
  const s = size;
  const bodyScale = stage === "baby" ? 0.72 : stage === "child" ? 0.83 : stage === "teen" ? 0.91 : 1;
  const bs = s * bodyScale;
  const cx = s * 0.5;
  const cy = s * 0.52;
  const r = bs * 0.35;
  const isSleeping = mood === "sleeping";
  const isSick = mood === "sick";
  const isHappy = mood === "happy" || mood === "ecstatic";
  const isSad = mood === "sad";
  const isElder = stage === "elder";

  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Path d={`M ${cx} ${cy - r * 1.4} L ${cx - r * 0.25} ${cy - r * 0.95} L ${cx - r * 0.5} ${cy - r * 1.2} L ${cx - r * 0.5} ${cy - r * 0.8} L ${cx - r} ${cy}`} stroke={isSick ? "#455A78" : "#2A5080"} strokeWidth={r * 0.12} fill="none" strokeLinecap="round" />
      <Path d={`M ${cx} ${cy - r * 1.4} L ${cx + r * 0.25} ${cy - r * 0.95} L ${cx + r * 0.5} ${cy - r * 1.2} L ${cx + r * 0.5} ${cy - r * 0.8} L ${cx + r} ${cy}`} stroke={isSick ? "#455A78" : "#2A5080"} strokeWidth={r * 0.12} fill="none" strokeLinecap="round" />
      <Circle cx={cx} cy={cy} r={r} fill={isSick ? "#2A3E55" : "#1E3A5F"} />
      <Circle cx={cx} cy={cy} r={r * 0.88} fill={isSick ? "#344D6A" : "#243A60"} />
      <Ellipse cx={cx - r * 0.22} cy={cy - r * 0.25} rx={r * 0.18} ry={r * 0.22} fill="rgba(255,255,255,0.09)" />
      {!isSleeping ? (
        <>
          <Rect x={cx - r * 0.55 - r * 0.14} y={cy - r * 0.4} width={r * 0.28} height={r * 0.3} rx={r * 0.07} fill={isSick ? Colors.danger : Colors.accent} />
          <Rect x={cx + r * 0.27} y={cy - r * 0.4} width={r * 0.28} height={r * 0.3} rx={r * 0.07} fill={isSick ? Colors.danger : Colors.accent} />
          <Rect x={cx - r * 0.55 - r * 0.06} y={cy - r * 0.36} width={r * 0.12} height={r * 0.12} rx={r * 0.03} fill={Colors.bg} />
          <Rect x={cx + r * 0.36} y={cy - r * 0.36} width={r * 0.12} height={r * 0.12} rx={r * 0.03} fill={Colors.bg} />
        </>
      ) : (
        <>
          <Path d={`M ${cx - r * 0.6} ${cy - r * 0.22} L ${cx - r * 0.32} ${cy - r * 0.22}`} stroke={Colors.textSecondary} strokeWidth={r * 0.07} strokeLinecap="round" />
          <Path d={`M ${cx + r * 0.31} ${cy - r * 0.22} L ${cx + r * 0.59} ${cy - r * 0.22}`} stroke={Colors.textSecondary} strokeWidth={r * 0.07} strokeLinecap="round" />
        </>
      )}
      {isHappy && (
        <Path d={`M ${cx - r * 0.22} ${cy + r * 0.18} Q ${cx} ${cy + r * 0.34} ${cx + r * 0.22} ${cy + r * 0.18}`} stroke={Colors.primary} strokeWidth={r * 0.07} fill="none" strokeLinecap="round" />
      )}
      {isSad && (
        <Path d={`M ${cx - r * 0.22} ${cy + r * 0.3} Q ${cx} ${cy + r * 0.2} ${cx + r * 0.22} ${cy + r * 0.3}`} stroke={Colors.textSecondary} strokeWidth={r * 0.07} fill="none" strokeLinecap="round" />
      )}
      {isElder && (
        <Circle cx={cx} cy={cy} r={r * 0.88} fill="#888888" opacity={0.15} />
      )}
      {isElder && !isSleeping && (
        <>
          <SvgText x={cx - r * 0.46} y={cy - r * 0.06} fontSize={r * 0.28} fill="#aaaaaa" textAnchor="middle">~</SvgText>
          <SvgText x={cx + r * 0.46} y={cy - r * 0.06} fontSize={r * 0.28} fill="#aaaaaa" textAnchor="middle">~</SvgText>
        </>
      )}
      {isSleeping && (
        <SvgText x={cx + r * 0.85} y={cy - r * 0.6} fontSize={r * 0.38} fill={Colors.info} opacity={0.8}>z</SvgText>
      )}
    </Svg>
  );
}

function NubbleCreature({ size, stage, mood }: { size: number; stage: PetStage; mood: PetMood }) {
  const s = size;
  const bodyScale = stage === "baby" ? 0.72 : stage === "child" ? 0.83 : stage === "teen" ? 0.91 : 1;
  const bs = s * bodyScale;
  const cx = s * 0.5;
  const cy = s * 0.53;
  const rx = bs * 0.42;
  const ry = bs * 0.32;
  const isSleeping = mood === "sleeping";
  const isSick = mood === "sick";
  const isHappy = mood === "happy" || mood === "ecstatic";
  const isElder = stage === "elder";

  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Circle cx={cx - rx * 0.55} cy={cy - ry * 1.05} r={rx * 0.25} fill={isSick ? "#2A3E55" : "#1E3A5F"} />
      <Circle cx={cx + rx * 0.55} cy={cy - ry * 1.05} r={rx * 0.25} fill={isSick ? "#2A3E55" : "#1E3A5F"} />
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={isSick ? "#2A3E55" : "#1E3A5F"} />
      <Ellipse cx={cx} cy={cy} rx={rx * 0.9} ry={ry * 0.85} fill={isSick ? "#344D6A" : "#243A60"} />
      <Ellipse cx={cx - rx * 0.2} cy={cy - ry * 0.3} rx={rx * 0.15} ry={ry * 0.2} fill="rgba(255,255,255,0.09)" />
      <Ellipse cx={cx} cy={cy + ry * 1.12} rx={rx * 0.6} ry={ry * 0.22} fill={isSick ? "#2A3E55" : "#1E3A5F"} opacity={0.8} />
      {!isSleeping ? (
        <>
          <Ellipse cx={cx - rx * 0.38} cy={cy - ry * 0.12} rx={rx * 0.17} ry={ry * 0.3} fill={isSick ? Colors.danger : Colors.primary} />
          <Ellipse cx={cx + rx * 0.38} cy={cy - ry * 0.12} rx={rx * 0.17} ry={ry * 0.3} fill={isSick ? Colors.danger : Colors.primary} />
          <Ellipse cx={cx - rx * 0.35} cy={cy - ry * 0.18} rx={rx * 0.07} ry={ry * 0.1} fill="rgba(255,255,255,0.9)" />
          <Ellipse cx={cx + rx * 0.41} cy={cy - ry * 0.18} rx={rx * 0.07} ry={ry * 0.1} fill="rgba(255,255,255,0.9)" />
        </>
      ) : (
        <>
          <Path d={`M ${cx - rx * 0.52} ${cy - ry * 0.05} L ${cx - rx * 0.24} ${cy - ry * 0.05}`} stroke={Colors.textSecondary} strokeWidth={ry * 0.12} strokeLinecap="round" />
          <Path d={`M ${cx + rx * 0.23} ${cy - ry * 0.05} L ${cx + rx * 0.52} ${cy - ry * 0.05}`} stroke={Colors.textSecondary} strokeWidth={ry * 0.12} strokeLinecap="round" />
        </>
      )}
      {isHappy && (
        <Path d={`M ${cx - rx * 0.2} ${cy + ry * 0.4} Q ${cx} ${cy + ry * 0.62} ${cx + rx * 0.2} ${cy + ry * 0.4}`} stroke={Colors.accent} strokeWidth={ry * 0.13} fill="none" strokeLinecap="round" />
      )}
      {isElder && (
        <Ellipse cx={cx} cy={cy} rx={rx * 0.9} ry={ry * 0.85} fill="#888888" opacity={0.15} />
      )}
      {isElder && !isSleeping && (
        <>
          <SvgText x={cx - rx * 0.38} y={cy + ry * 0.22} fontSize={ry * 0.52} fill="#aaaaaa" textAnchor="middle">~</SvgText>
          <SvgText x={cx + rx * 0.38} y={cy + ry * 0.22} fontSize={ry * 0.52} fill="#aaaaaa" textAnchor="middle">~</SvgText>
        </>
      )}
      {isSleeping && (
        <SvgText x={cx + rx * 0.75} y={cy - ry * 0.8} fontSize={ry * 0.7} fill={Colors.info} opacity={0.8}>z</SvgText>
      )}
    </Svg>
  );
}

export default function PetCreature({
  species,
  stage,
  mood,
  size = 160,
  eggTaps = 0,
  eggTapsToHatch = 10,
  equippedItems,
}: PetCreatureProps) {
  const bounceY = useSharedValue(0);
  const scaleAnim = useSharedValue(1);
  const rotateAnim = useSharedValue(0);

  useEffect(() => {
    if (mood === "sleeping") {
      bounceY.value = withRepeat(
        withSequence(
          withTiming(4, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
      scaleAnim.value = 1;
    } else if (mood === "ecstatic") {
      bounceY.value = withRepeat(
        withSequence(
          withTiming(-12, { duration: 300, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      );
      rotateAnim.value = withRepeat(
        withSequence(
          withTiming(-0.05, { duration: 200 }),
          withTiming(0.05, { duration: 200 }),
          withTiming(0, { duration: 200 })
        ),
        -1,
        false
      );
    } else if (mood === "happy") {
      bounceY.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 600, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 600, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      );
    } else if (mood === "sick") {
      rotateAnim.value = withRepeat(
        withSequence(
          withTiming(-0.04, { duration: 400 }),
          withTiming(0.04, { duration: 400 }),
          withTiming(0, { duration: 400 })
        ),
        -1,
        false
      );
      bounceY.value = 0;
    } else if (stage === "egg") {
      bounceY.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
    } else {
      bounceY.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
      rotateAnim.value = 0;
    }
  }, [mood, stage]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bounceY.value },
      { scale: scaleAnim.value },
      { rotate: `${rotateAnim.value}rad` },
    ],
  }));

  const renderCreature = () => {
    if (stage === "egg") {
      return (
        <EggCreature
          size={size}
          mood={mood}
          eggTaps={eggTaps}
          eggTapsToHatch={eggTapsToHatch}
        />
      );
    }
    switch (species) {
      case "glorp":
        return <GlorpCreature size={size} stage={stage} mood={mood} />;
      case "zippix":
        return <ZippixCreature size={size} stage={stage} mood={mood} />;
      case "nubble":
        return <NubbleCreature size={size} stage={stage} mood={mood} />;
    }
  };

  const hasCosmetics = equippedItems && stage !== "egg" && Object.keys(equippedItems).length > 0;

  return (
    <Animated.View
      style={[styles.container, animatedStyle, { width: size, height: size }]}
    >
      {renderCreature()}
      {hasCosmetics && (
        <View style={[StyleSheet.absoluteFillObject, { alignItems: "center" }]} pointerEvents="none">
          {equippedItems!.skin && (
            <Text style={{ position: "absolute", fontSize: size * 0.22, top: size * 0.15, opacity: 0.6 }}>
              {equippedItems!.skin}
            </Text>
          )}
          {equippedItems!.glasses && (
            <Text style={{ position: "absolute", fontSize: size * 0.18, top: size * 0.3 }}>
              {equippedItems!.glasses}
            </Text>
          )}
          {equippedItems!.costume && (() => {
            const emoji = equippedItems!.costume;
            if (emoji === "🎈" || emoji === "🍳") {
              return (
                <Text style={{ position: "absolute", fontSize: size * 0.24, left: size * 0.05, top: size * 0.25 }}>
                  {emoji}
                </Text>
              );
            }
            if (emoji === "🪄") {
              return (
                <Text style={{ position: "absolute", fontSize: size * 0.24, right: size * 0.05, top: size * 0.25 }}>
                  {emoji}
                </Text>
              );
            }
            return (
              <Text style={{ position: "absolute", fontSize: size * 0.22, top: size * 0.52 }}>
                {emoji}
              </Text>
            );
          })()}
          {equippedItems!.hat && (
            <Text style={{ position: "absolute", fontSize: size * 0.2, top: size * 0.02 }}>
              {equippedItems!.hat}
            </Text>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
