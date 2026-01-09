import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Settings as SettingsIcon, Clock, Calendar, Mail, MessageSquare, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/services/api';
import { useAuthListener } from '@/app/hooks/useAuthListener';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Settings() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user, loading: authLoading } = useAuthListener();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/admin/login', { replace: true, state: { from: location.pathname } });
      return;
    }

    adminApi.settings.get()
      .then((data) => {
        setSettings(data);
      })
      .catch((error) => {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.settings.update(settings);
      toast.success('Settings saved successfully');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <AdminLayout title="Settings">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return null;
  }

  if (!settings) {
    return (
      <AdminLayout title="Settings">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Failed to load settings</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Settings">
      <div className="max-w-4xl space-y-6">
        {/* Operating Hours */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-semibold">Operating Hours</h3>
          </div>

          <div className="space-y-4">
            {[
              { day: 'Monday - Thursday', hours: '17:30 - 22:00' },
              { day: 'Friday - Saturday', hours: '17:30 - 23:00' },
              { day: 'Sunday', hours: '17:30 - 21:30' },
            ].map((schedule) => (
              <div key={schedule.day} className="flex items-center justify-between p-4 bg-accent rounded-lg">
                <span className="font-medium">{schedule.day}</span>
                <Input
                  defaultValue={schedule.hours}
                  className="w-48"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Capacity Settings */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <SettingsIcon className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-semibold">Capacity Management</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="indoorCapacity">Indoor Capacity (per time slot)</Label>
              <Input
                id="indoorCapacity"
                type="number"
                value={settings.capacities?.indoor || 0}
                onChange={(e) => setSettings({
                  ...settings,
                  capacities: { ...settings.capacities, indoor: parseInt(e.target.value) }
                })}
              />
              <p className="text-sm text-muted-foreground">Total indoor seating capacity</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="balconyCapacity">Balcony Capacity (per time slot)</Label>
              <Input
                id="balconyCapacity"
                type="number"
                value={settings.capacities?.balcony || 0}
                onChange={(e) => setSettings({
                  ...settings,
                  capacities: { ...settings.capacities, balcony: parseInt(e.target.value) }
                })}
              />
              <p className="text-sm text-muted-foreground">Total balcony seating capacity</p>
            </div>
          </div>
        </div>

        {/* Booking Policies */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-semibold">Booking Policies</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="advanceBooking">Advance Booking Window (days)</Label>
              <Input
                id="advanceBooking"
                type="number"
                value={settings.maxAdvanceBookingDays || 0}
                onChange={(e) => setSettings({ ...settings, maxAdvanceBookingDays: parseInt(e.target.value) })}
              />
              <p className="text-sm text-muted-foreground">How far in advance customers can book</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancellationWindow">Cancellation Window (hours)</Label>
              <Input
                id="cancellationWindow"
                type="number"
                value={settings.cancellationWindowHours || 0}
                onChange={(e) => setSettings({ ...settings, cancellationWindowHours: parseInt(e.target.value) })}
              />
              <p className="text-sm text-muted-foreground">Required notice for cancellations</p>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Mail className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-semibold">Notification Settings</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Send confirmation emails to guests</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                className="w-5 h-5"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">SMS Notifications</p>
                  <p className="text-sm text-muted-foreground">Send SMS confirmations to guests</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.smsNotifications}
                onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
                className="w-5 h-5"
              />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <Label>Email Template Preview</Label>
              <div className="mt-2 p-4 bg-accent/50 rounded-lg text-sm border border-border">
                <p className="font-semibold mb-2">Subject: Your Fresh Garden Reservation is Confirmed</p>
                <p className="text-muted-foreground">
                  Dear {'{'} Guest Name {'}'},<br /><br />
                  Your reservation at Fresh Garden has been confirmed!<br />
                  Date: {'{'} Date {'}'}<br />
                  Time: {'{'} Time {'}'}<br />
                  Party Size: {'{'} Size {'}'}<br /><br />
                  We look forward to serving you!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button size="lg" className="gap-2" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save All Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
