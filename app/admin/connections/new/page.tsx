import { Card } from '@/components/ui/card';

export default function NewConnectionPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Create New Connection</h1>

      <Card className="p-8 text-center">
        <p className="mb-4 text-gray-600">
          Connection wizard will be implemented here
        </p>
        <p className="text-sm text-gray-500">
          This is a placeholder. The 7-step wizard for creating connections
          will guide you through:
        </p>
        <ul className="mt-4 list-inside list-decimal space-y-1 text-left text-sm text-gray-500">
          <li>Credentials (SmartSuite API Key, Webflow Token)</li>
          <li>Source Selection (SmartSuite Base & Table)</li>
          <li>Target Selection (Webflow Site & Collection)</li>
          <li>Field Mapping</li>
          <li>Transforms & Configuration</li>
          <li>Test Mapping</li>
          <li>Webhook Setup</li>
        </ul>
      </Card>
    </div>
  );
}
