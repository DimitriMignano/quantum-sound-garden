import { createContext, useContext } from 'react';
import { SOUND_LINGO, type Lingo } from '../content/content';

/** The words a scene speaks (sounds, or qubits). Components read it so the board, the beads and the tiles relabel together. */
const LingoContext = createContext<Lingo>(SOUND_LINGO);
export const LingoProvider = LingoContext.Provider;
export const useLingo = (): Lingo => useContext(LingoContext);
