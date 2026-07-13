import React from "react";
import {Audio} from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

const C = {
  ink: "#171512",
  paper: "#fbf8f2",
  surface: "#fffdf9",
  muted: "#746f68",
  line: "#ddd5ca",
  honey: "#efb64b",
  honeySoft: "#f8e9c8",
  green: "#23835a",
};

const ease = Easing.bezier(0.16, 1, 0.3, 1);

const fade = (frame: number, duration: number) =>
  interpolate(frame, [0, 14, duration - 14, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

const rise = (frame: number, delay = 0) =>
  interpolate(frame, [delay, delay + 22], [38, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

const Scene: React.FC<{
  children: React.ReactNode;
  duration: number;
  dark?: boolean;
}> = ({children, duration, dark = false}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        opacity: fade(frame, duration),
        background: dark ? C.ink : C.paper,
        color: dark ? C.paper : C.ink,
        padding: "100px 112px",
        overflow: "hidden",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const Eyebrow: React.FC<{children: React.ReactNode; dark?: boolean}> = ({children, dark}) => (
  <div style={{fontSize: 30, fontWeight: 750, color: dark ? C.honey : C.green, marginBottom: 22}}>{children}</div>
);

const Headline: React.FC<{children: React.ReactNode; size?: number}> = ({children, size = 92}) => (
  <div style={{fontSize: size, fontWeight: 820, lineHeight: 1.04, letterSpacing: -2, maxWidth: 900}}>{children}</div>
);

const Subhead: React.FC<{children: React.ReactNode; dark?: boolean}> = ({children, dark}) => (
  <div style={{fontSize: 38, lineHeight: 1.35, color: dark ? "#c8c1b8" : C.muted, marginTop: 28, maxWidth: 820}}>{children}</div>
);

const Window: React.FC<{src: string; width: number; rotate?: number}> = ({src, width, rotate = 0}) => (
  <div style={{padding: 18, background: C.surface, borderRadius: 28, boxShadow: "0 36px 100px rgba(36,25,12,.2)", rotate: `${rotate}deg`}}>
    <Img src={staticFile(src)} style={{display: "block", width, borderRadius: 14}} />
  </div>
);

const FormRow: React.FC<{label: string; value?: string; active?: boolean; done?: boolean}> = ({label, value, active, done}) => (
  <div style={{display: "grid", gridTemplateColumns: "270px 1fr 36px", gap: 20, alignItems: "center", minHeight: 82, padding: "0 26px", borderBottom: `1px solid ${C.line}`, background: active ? C.honeySoft : C.surface}}>
    <div style={{fontSize: 25, color: C.muted}}>{label}</div>
    <div style={{fontSize: 28, fontWeight: 720, color: value ? C.ink : "#b5aea5"}}>{value || "Type here…"}</div>
    <div style={{fontSize: 30, color: done ? C.green : "transparent"}}>✓</div>
  </div>
);

const PainScene: React.FC = () => {
  const frame = useCurrentFrame();
  const cards = [0, 1, 2];
  return (
    <Scene duration={90}>
      <div style={{display: "grid", gridTemplateColumns: "760px 1fr", alignItems: "center", height: "100%", gap: 70}}>
        <div style={{translate: `0 ${rise(frame)}px`}}>
          <Eyebrow>FORM AFTER FORM</Eyebrow>
          <Headline>Still typing the same details?</Headline>
          <Subhead>Names. Emails. Work authorization. Again and again.</Subhead>
        </div>
        <div style={{position: "relative", height: 760}}>
          {cards.map((card) => (
            <div key={card} style={{position: "absolute", top: 70 + card * 125, left: card * 80, width: 720, padding: 28, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 22, boxShadow: "0 24px 70px rgba(36,25,12,.12)", translate: `${interpolate(frame, [card * 8, card * 8 + 24], [180, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease})}px 0`}}>
              <div style={{fontSize: 24, fontWeight: 760, marginBottom: 20}}>Application {card + 1}</div>
              <FormRow label="Full name" />
              <FormRow label="Email" />
            </div>
          ))}
        </div>
      </div>
    </Scene>
  );
};

const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Scene duration={90} dark>
      <div style={{display: "grid", gridTemplateColumns: "760px 1fr", alignItems: "center", gap: 130, height: "100%"}}>
        <div style={{translate: `0 ${rise(frame)}px`}}>
          <Eyebrow dark>MEET CATFILL</Eyebrow>
          <Headline>One profile. Three clear choices.</Headline>
          <Subhead dark>Use AI for complex forms, local fill for familiar ones, or learn from what you already entered.</Subhead>
        </div>
        <div style={{scale: interpolate(frame, [0, 28], [0.9, 1], {extrapolateRight: "clamp", easing: ease}), translate: `${interpolate(frame, [0, 28], [80, 0], {extrapolateRight: "clamp", easing: ease})}px 0`}}>
          <Window src="ui/popup-main.png" width={615} rotate={-1.2} />
        </div>
      </div>
    </Scene>
  );
};

const WritingCat: React.FC = () => {
  const frame = useCurrentFrame();
  const index = Math.floor(frame / 4) % 3;
  return <Img src={staticFile(`brand/writing-frames/frame-${index}.png`)} style={{width: 170, height: 170}} />;
};

const FillScene: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = Math.floor(interpolate(frame, [45, 175], [0, 5], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}));
  const rows = [
    ["Full name", "Sample Applicant"],
    ["Email", "applicant@example.test"],
    ["Phone", "+44 7700 900000"],
    ["Work authorization", "Yes"],
    ["Visa sponsorship", "No"],
  ];
  return (
    <Scene duration={210}>
      <div style={{display: "grid", gridTemplateRows: "auto 1fr", height: "100%", gap: 48}}>
        <div style={{display: "flex", alignItems: "end", justifyContent: "space-between"}}>
          <div>
            <Eyebrow>AI SAFE FILL</Eyebrow>
            <Headline size={76}>Understand first. Fill second.</Headline>
          </div>
          <div style={{display: "flex", alignItems: "center", gap: 20, opacity: interpolate(frame, [25, 42], [0, 1], {extrapolateRight: "clamp"})}}>
            <WritingCat />
            <div style={{fontSize: 28, fontWeight: 750}}>Reviewing each field…</div>
          </div>
        </div>
        <div style={{display: "grid", gridTemplateColumns: "1fr 560px", gap: 60, alignItems: "center"}}>
          <div style={{overflow: "hidden", border: `1px solid ${C.line}`, borderRadius: 22, boxShadow: "0 30px 90px rgba(36,25,12,.13)"}}>
            <div style={{height: 64, display: "flex", alignItems: "center", padding: "0 26px", fontSize: 24, fontWeight: 780, background: C.ink, color: C.paper}}>Job application</div>
            {rows.map(([label, value], index) => <FormRow key={label} label={label} value={index < progress ? value : undefined} active={index === progress} done={index < progress} />)}
          </div>
          <div style={{translate: `${interpolate(frame, [20, 55], [80, 0], {extrapolateRight: "clamp", easing: ease})}px 0`}}>
            <Window src={progress >= 5 ? "ui/popup-result.png" : "ui/popup-main.png"} width={470} />
          </div>
        </div>
      </div>
    </Scene>
  );
};

const DemoProfile: React.FC = () => {
  const groups = [
    ["Identity", [["Full name", "Sample Applicant"], ["Email", "applicant@example.test"]]],
    ["Work", [["Work authorization", "Yes"], ["Visa sponsorship required", "No"]]],
    ["Contact", [["Phone", "+44 7700 900000"], ["Portfolio", "example.test/profile"]]],
  ] as const;

  return (
    <div style={{width: 500, padding: 24, background: C.surface, borderRadius: 20, boxShadow: "0 36px 100px rgba(36,25,12,.2)"}}>
      <div style={{display: "flex", alignItems: "center", gap: 12, marginBottom: 24}}>
        <Img src={staticFile("brand/catfill-icon.png")} style={{width: 34, height: 34}} />
        <div style={{fontSize: 24, fontWeight: 820}}>CatFill</div>
        <div style={{marginLeft: "auto", fontSize: 19, color: C.muted}}>Demo profile</div>
      </div>
      <div style={{display: "grid", gap: 18}}>
        {groups.map(([title, fields]) => (
          <div key={title}>
            <div style={{fontSize: 18, fontWeight: 800, color: C.green, marginBottom: 9}}>{title}</div>
            <div style={{padding: "4px 16px", border: `1px solid ${C.line}`, borderRadius: 12}}>
              {fields.map(([label, value]) => (
                <div key={label} style={{padding: "11px 0"}}>
                  <div style={{fontSize: 15, fontWeight: 720, color: C.muted, marginBottom: 4}}>{label}</div>
                  <div style={{fontSize: 20, fontWeight: 520}}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SemanticsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const items = [
    ["Work authorization", "Can you legally work here?", "Yes"],
    ["Visa sponsorship", "Will you need sponsorship now or later?", "No"],
    ["Office attendance", "Can you work from our London office?", "Yes"],
  ];
  return (
    <Scene duration={120} dark>
      <div style={{display: "grid", gridTemplateColumns: "620px 1fr", gap: 120, alignItems: "center", height: "100%"}}>
        <div style={{translate: `0 ${rise(frame)}px`}}>
          <Eyebrow dark>SEMANTIC MATCHING</Eyebrow>
          <Headline size={76}>Similar answers. Different questions.</Headline>
          <Subhead dark>CatFill keeps work authorization, sponsorship, and consent separate.</Subhead>
        </div>
        <div style={{display: "grid", gap: 18}}>
          {items.map(([label, question, answer], index) => (
            <div key={label} style={{display: "grid", gridTemplateColumns: "260px 1fr 90px", gap: 24, alignItems: "center", padding: "26px 30px", color: C.ink, background: C.surface, borderRadius: 18, opacity: interpolate(frame, [index * 14, index * 14 + 18], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), translate: `${interpolate(frame, [index * 14, index * 14 + 18], [80, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease})}px 0`}}>
              <div style={{fontSize: 24, fontWeight: 800, color: C.green}}>{label}</div>
              <div style={{fontSize: 28}}>{question}</div>
              <div style={{fontSize: 28, fontWeight: 820, textAlign: "center", padding: "10px 0", background: C.honeySoft, borderRadius: 10}}>{answer}</div>
            </div>
          ))}
        </div>
      </div>
    </Scene>
  );
};

const PrivacyScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Scene duration={120}>
      <div style={{display: "grid", gridTemplateColumns: "700px 1fr", gap: 120, alignItems: "center", height: "100%"}}>
        <div style={{scale: interpolate(frame, [0, 28], [0.92, 1], {extrapolateRight: "clamp", easing: ease})}}>
          <DemoProfile />
        </div>
        <div style={{translate: `0 ${rise(frame)}px`}}>
          <Eyebrow>YOUR DATA, YOUR CONTROL</Eyebrow>
          <Headline size={78}>Saved locally. AI is optional.</Headline>
          <Subhead>Your profiles stay in your browser. You choose the provider and when AI is used.</Subhead>
          <div style={{display: "flex", gap: 18, marginTop: 42}}>
            {["Local profiles", "Your API key", "Review before save"].map((item) => <div key={item} style={{padding: "16px 20px", fontSize: 25, fontWeight: 760, background: C.honeySoft, borderRadius: 10}}>{item}</div>)}
          </div>
        </div>
      </div>
    </Scene>
  );
};

const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Scene duration={120} dark>
      <div style={{display: "grid", placeItems: "center", alignContent: "center", gap: 26, height: "100%", textAlign: "center"}}>
        <Img src={staticFile("brand/catfill-icon.png")} style={{width: 190, height: 190, scale: interpolate(frame, [0, 26], [0.72, 1], {extrapolateRight: "clamp", easing: ease})}} />
        <div style={{fontSize: 116, fontWeight: 850, letterSpacing: -3}}>CatFill</div>
        <div style={{fontSize: 46, fontWeight: 720, color: C.honey}}>AI Form Autofill</div>
        <div style={{fontSize: 34, color: "#c8c1b8"}}>Fill forms faster. Stay in control.</div>
      </div>
    </Scene>
  );
};

export const CatFillPromo: React.FC = () => (
  <AbsoluteFill style={{background: C.paper}}>
    {[90, 180, 390, 510, 630].map((start) => (
      <Sequence key={start} from={start} durationInFrames={30}>
        <Audio src={staticFile("audio/whoosh.wav")} volume={0.22} />
      </Sequence>
    ))}
    {[238, 264, 290, 316, 342].map((start) => (
      <Sequence key={start} from={start} durationInFrames={18}>
        <Audio src={staticFile("audio/click.wav")} volume={0.1} />
      </Sequence>
    ))}
    <Sequence from={654} durationInFrames={60}>
      <Audio src={staticFile("audio/ding.wav")} volume={0.22} />
    </Sequence>
    <Sequence durationInFrames={90}><PainScene /></Sequence>
    <Sequence from={90} durationInFrames={90}><IntroScene /></Sequence>
    <Sequence from={180} durationInFrames={210}><FillScene /></Sequence>
    <Sequence from={390} durationInFrames={120}><SemanticsScene /></Sequence>
    <Sequence from={510} durationInFrames={120}><PrivacyScene /></Sequence>
    <Sequence from={630} durationInFrames={120}><OutroScene /></Sequence>
  </AbsoluteFill>
);
