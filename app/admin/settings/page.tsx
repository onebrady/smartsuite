import { Card } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">System Information</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Version:</span>
            <span className="font-mono">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Environment:</span>
            <span className="font-mono">{process.env.NODE_ENV}</span>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Documentation</h2>
        <ul className="list-inside list-disc space-y-2 text-gray-600">
          <li>
            <a
              href="https://docs.smartsuite.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              SmartSuite Documentation
            </a>
          </li>
          <li>
            <a
              href="https://developers.webflow.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Webflow API Documentation
            </a>
          </li>
        </ul>
      </Card>
    </div>
  );
}
