import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useCampaigns } from '../../hooks/useCampaigns';

const registerSenderSchema = z.object({
  email: z.string().email('Invalid email address format'),
  smtpHost: z.string().min(1, 'SMTP Host is required'),
  smtpPort: z.coerce.number().int().positive('SMTP Port must be a positive integer'),
  smtpUser: z.string().min(1, 'SMTP User is required'),
  smtpPassword: z.string().min(1, 'SMTP Password is required'),
});

type RegisterSenderSchema = z.infer<typeof registerSenderSchema>;

export interface RegisterSenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const RegisterSenderModal: React.FC<RegisterSenderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { registerSender, isRegisteringSender } = useCampaigns();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegisterSenderSchema>({
    resolver: zodResolver(registerSenderSchema),
    defaultValues: {
      smtpHost: 'smtp.ethereal.email',
      smtpPort: 587,
    },
  });

  const onSubmit = async (data: RegisterSenderSchema) => {
    setApiError(null);
    try {
      await registerSender(data);
      onSuccess(`SMTP Sender ${data.email} registered successfully!`);
      reset();
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to register SMTP sender';
      setApiError(msg);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register SMTP Sender" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pb-2">
        <p className="text-xs text-dark-400 mb-2 leading-relaxed">
          Configure an SMTP sender. For testing, you can use an Ethereal SMTP account. If fields are left blank on startup, the system generates fallback ones automatically.
        </p>

        <Input
          label="Sender Email Address"
          placeholder="outreach@domain.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <Input
              label="SMTP Host"
              placeholder="smtp.domain.com"
              error={errors.smtpHost?.message}
              {...register('smtpHost')}
            />
          </div>
          <div>
            <Input
              label="SMTP Port"
              type="number"
              placeholder="587"
              error={errors.smtpPort?.message}
              {...register('smtpPort')}
            />
          </div>
        </div>

        <Input
          label="SMTP User / Username"
          placeholder="user@domain.com"
          error={errors.smtpUser?.message}
          {...register('smtpUser')}
        />

        <Input
          label="SMTP Password"
          type="password"
          placeholder="••••••••••••"
          error={errors.smtpPassword?.message}
          {...register('smtpPassword')}
        />

        {apiError && (
          <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-lg text-xs font-semibold text-red-400">
            {apiError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-dark-800/80">
          <Button variant="glass" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isRegisteringSender}>
            Register Sender
          </Button>
        </div>
      </form>
    </Modal>
  );
};
