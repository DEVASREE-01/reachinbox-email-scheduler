import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useCampaigns } from '../../hooks/useCampaigns';
import { parseCSVInFrontend, FrontendCSVResult } from '../../utils/csv';
import { Upload, FileText, CheckCircle2, AlertCircle, PlusCircle } from 'lucide-react';

// Form validation schema
const composeSchema = z.object({
  senderId: z.string().min(1, 'Please select an active sender'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Email body is required'),
  startTime: z.string().refine((val) => new Date(val).getTime() >= Date.now() - 60000, {
    message: 'Start time must be in the present or future',
  }),
  delayMs: z.coerce.number().int().min(2000, 'Delay must be at least 2000ms (2 seconds)'),
  hourlyLimit: z.coerce.number().int().positive('Hourly limit must be positive'),
});

type ComposeSchema = z.infer<typeof composeSchema>;

export interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onAddSenderClick: () => void;
}

export const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onAddSenderClick,
}) => {
  const { senders, scheduleCampaign, isScheduling } = useCampaigns();
  
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvStats, setCsvStats] = useState<FrontendCSVResult | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ComposeSchema>({
    resolver: zodResolver(composeSchema),
    defaultValues: {
      delayMs: 2000,
      hourlyLimit: 50,
      startTime: new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16), // Default to 5 minutes in future
    },
  });

  // Handle local CSV selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith('.csv')) {
      setCsvError('Please select a valid .csv file');
      setCsvFile(null);
      setCsvStats(null);
      return;
    }

    setCsvError(null);
    setCsvFile(file);

    try {
      const stats = await parseCSVInFrontend(file);
      setCsvStats(stats);
    } catch (err) {
      setCsvError('Failed to parse CSV file. Ensure it is formatted correctly.');
      setCsvFile(null);
      setCsvStats(null);
    }
  };

  // Trigger file selection input
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Submit Handler
  const onSubmit = async (data: ComposeSchema) => {
    if (!csvFile || !csvStats || csvStats.valid === 0) {
      setCsvError('Please upload a CSV containing at least one valid recipient');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('senderId', data.senderId);
      formData.append('subject', data.subject);
      formData.append('body', data.body);
      formData.append('startTime', new Date(data.startTime).toISOString());
      formData.append('delayMs', String(data.delayMs));
      formData.append('hourlyLimit', String(data.hourlyLimit));
      formData.append('file', csvFile);

      await scheduleCampaign(formData);
      onSuccess(`Campaign scheduled successfully for ${csvStats.valid} recipients!`);
      
      // Cleanup states
      setCsvFile(null);
      setCsvStats(null);
      reset();
      onClose();
    } catch (error: any) {
      const apiMsg = error.response?.data?.message || 'Failed to schedule campaign';
      setCsvError(apiMsg);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compose Campaign" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 pb-2">
        
        {/* Sender Selection */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-dark-300">
              Sender Account
            </label>
            <button
              type="button"
              onClick={onAddSenderClick}
              className="text-xs text-brand-400 hover:text-brand-300 font-bold flex items-center gap-1 transition-all duration-150"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add SMTP Sender
            </button>
          </div>

          {senders.length === 0 ? (
            <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-lg text-xs font-semibold text-red-400 text-center">
              No active sender available. Add and activate an SMTP sender first.
            </div>
          ) : (
            <select
              {...register('senderId')}
              className={`w-full px-3.5 py-2.5 bg-dark-900/60 border rounded-lg text-sm text-white focus:outline-none focus:ring-2 transition-all duration-200 ${
                errors.senderId
                  ? 'border-red-500/50 focus:ring-red-500/30'
                  : 'border-dark-700/60 focus:border-brand-500/60 focus:ring-brand-500/25'
              }`}
            >
              <option value="" className="bg-dark-950">Select Sender SMTP Account</option>
              {senders.map((s) => (
                <option key={s.id} value={s.id} className="bg-dark-950">
                  {s.email} | {s.smtpHost} | ● ACTIVE
                </option>
              ))}
            </select>
          )}
          {errors.senderId && (
            <span className="text-xs text-red-400 font-medium">{errors.senderId.message}</span>
          )}
        </div>

        {/* Subject input */}
        <Input
          label="Subject Line"
          placeholder="e.g. Welcome to ReachInbox!"
          error={errors.subject?.message}
          {...register('subject')}
        />

        {/* Email Body TextArea */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-dark-300">
            Email Body (Plain Text)
          </label>
          <textarea
            placeholder="Write your outreach email content here..."
            rows={5}
            {...register('body')}
            className={`w-full px-3.5 py-2.5 bg-dark-900/60 border rounded-lg text-sm text-white placeholder-dark-500 focus:outline-none focus:ring-2 transition-all duration-200 ${
              errors.body
                ? 'border-red-500/50 focus:ring-red-500/30'
                : 'border-dark-700/60 focus:border-brand-500/60 focus:ring-brand-500/25'
            }`}
          />
          {errors.body && (
            <span className="text-xs text-red-400 font-medium">{errors.body.message}</span>
          )}
        </div>

        {/* CSV File Upload Section */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-dark-300">
            Recipients CSV Upload
          </label>
          
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onClick={triggerFileSelect}
            className={`cursor-pointer w-full py-6 px-4 bg-dark-900/30 border border-dashed rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-dark-900/50 hover:border-brand-500/40 transition-all duration-200 ${
              csvError ? 'border-red-500/30' : 'border-dark-750'
            }`}
          >
            {csvFile ? (
              <div className="flex items-center gap-2 text-brand-400">
                <FileText className="w-6 h-6" />
                <span className="text-sm font-semibold text-white">{csvFile.name}</span>
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 text-dark-400" />
                <span className="text-sm font-medium text-dark-200">
                  Click to choose CSV file
                </span>
                <span className="text-[10px] text-dark-500">
                  File must contain an email column
                </span>
              </>
            )}
          </div>

          {/* CSV stats summary */}
          {csvStats && (
            <div className="mt-1.5 p-3.5 bg-dark-900/50 border border-dark-800 rounded-lg flex flex-col gap-1">
              <h5 className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                CSV Analysis Results
              </h5>
              <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold">
                <div className="bg-emerald-950/20 border border-emerald-900/20 p-1.5 rounded text-emerald-400 text-center">
                  {csvStats.valid} Valid
                </div>
                <div className="bg-dark-950 border border-dark-800 p-1.5 rounded text-dark-300 text-center">
                  {csvStats.duplicates} Duplicates Removed
                </div>
                <div className="bg-red-950/20 border border-red-900/20 p-1.5 rounded text-red-400 text-center">
                  {csvStats.invalid} Invalid Skipped
                </div>
              </div>
            </div>
          )}

          {csvError && (
            <span className="text-xs text-red-400 font-medium flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {csvError}
            </span>
          )}
        </div>

        {/* Delivery Speeds Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Start Time"
            type="datetime-local"
            error={errors.startTime?.message}
            {...register('startTime')}
          />
          <Input
            label="Delay between emails"
            type="number"
            helperText="Minimum 2000ms (2s)"
            error={errors.delayMs?.message}
            {...register('delayMs')}
          />
          <Input
            label="Hourly Sender Limit"
            type="number"
            helperText="Maximum per hour window"
            error={errors.hourlyLimit?.message}
            {...register('hourlyLimit')}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-dark-800/80">
          <Button variant="glass" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={isScheduling}
            disabled={senders.length === 0}
          >
            Schedule Emails
          </Button>
        </div>

      </form>
    </Modal>
  );
};
