import { motion, fadeUp, smooth } from '../components/motion';

export default function ExportSettings() {
  return (
    <motion.section variants={fadeUp} transition={smooth} className="bg-surface-darker border border-surface-dark rounded-sm p-6">
      <h2 className="text-sm text-gray-300 font-bold mb-2">Session data</h2>
      <p className="text-sm text-gray-400 leading-relaxed">Session records can contain complete transcripts and case solutions. Export is an administrator action on the server; this screen does not collect database credentials or expose private exports.</p>
      <p className="mt-3 text-sm text-gray-400 leading-relaxed">Exporting a transcript does not train or improve a model automatically.</p>
    </motion.section>
  );
}
