'use client';

import { useSettingsPage } from './useSettingsPage';
import { BackButton, PageShell, PageHeader } from '../components/ui';
import { motion, PageMotion, fadeIn, stagger, smooth } from '../components/motion';
import { AudioSettings } from './AudioSettings';
import PreferenceSettings from './PreferenceSettings';
import ConnectionSettings from './ConnectionSettings';
import ExportSettings from './ExportSettings';

export default function SettingsPage() {
  const model = useSettingsPage();
  return (
    <PageShell>
      <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={smooth}>
        <BackButton />
      </motion.div>
      <PageMotion>
        <div className="max-w-lg mx-auto px-6 py-12">
          <PageHeader label="Configuration" title="SETTINGS" />
          <motion.div className="space-y-8" variants={stagger(0.09)} initial="hidden" animate="visible">
            {model.saveError && <p role="alert" className="text-sm text-accent">Preferences could not be saved. Check browser storage permissions and try again.</p>}
            <AudioSettings {...model} />
            <PreferenceSettings {...model} />
            <ConnectionSettings />
            <ExportSettings />
            <motion.button variants={fadeIn} whileHover={{ scale: 1.03 }} onClick={model.handleReset}
              className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-wider transition-colors">
              Reset to defaults
            </motion.button>
          </motion.div>
        </div>
      </PageMotion>
    </PageShell>
  );
}
