import { useState } from 'react';
import { login, getAccessToken } from '../auth/msal';
import { triggerDeployment } from '../services/deploy';

export default function ProvisionForm() {
  const [form, setForm] = useState({ domain: '', region: 'westus2', email: '' });

  const handleSubmit = async () => {
    const account = await login();
    const token = await getAccessToken(['https://graph.microsoft.com/.default']);
    
    const result = await triggerDeployment({ ...form, token });
    alert(result.status ? 'Deployment triggered!' : 'Error');
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Provision New Environment</h1>
      <input type="text" placeholder="Your Org Domain" onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} />
      <select onChange={e => setForm(f => ({ ...f, region: e.target.value }))}>
        <option value="westus2">West US 2</option>
        <option value="eastus">East US</option>
      </select>
      <button onClick={handleSubmit} className="mt-4 bg-blue-600 text-white px-4 py-2">Deploy</button>
    </div>
  );
}