import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { WidgetsFlotantes } from "./WidgetsFlotantes";
import { MotoRokaServicio } from "./MotoRokaServicio";
import { RegalosMotoRoka } from "./RegalosMotoRoka";
import { PabloKnauth } from "./PabloKnauth";
import { BodegaRenta } from "./BodegaRenta";
import { BodegaChica } from "./BodegaChica";
import { MotoRokaCalidad } from "./MotoRokaCalidad";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <Composition
        id="WidgetsFlotantes"
        component={WidgetsFlotantes}
        durationInFrames={208}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="MotoRokaServicio"
        component={MotoRokaServicio}
        durationInFrames={838}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="RegalosMotoRoka"
        component={RegalosMotoRoka}
        durationInFrames={787}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="PabloKnauth"
        component={PabloKnauth}
        durationInFrames={659}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="BodegaRenta"
        component={BodegaRenta}
        durationInFrames={863}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="BodegaChica"
        component={BodegaChica}
        durationInFrames={1301}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="MotoRokaCalidad"
        component={MotoRokaCalidad}
        durationInFrames={1049}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
