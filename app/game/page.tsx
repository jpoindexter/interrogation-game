'use client';

import { Suspense } from 'react';
import LoadingScreen from './components/LoadingScreen';
import { useGameController } from './controller/useGameController';
import { GameView } from './view/GameView';

function GameContent() {
  const game = useGameController();
  return <GameView {...game} />;
}

export default function GamePage() {
  return <Suspense fallback={<LoadingScreen />}><GameContent /></Suspense>;
}
