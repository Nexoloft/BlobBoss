import { BlobCharacter } from './blob.js';

const blob = new BlobCharacter(document.getElementById('blob-container'));

// Temporary test sequence — remove in Task 4
blob.setStage(1);
setTimeout(() => blob.setStage(2), 2000);
setTimeout(() => blob.setStage(3), 4000);
setTimeout(() => blob.setStage(4), 6000);
setTimeout(() => { blob.setStage(0); blob.setStreak(5); blob.celebrate(); }, 8000);
