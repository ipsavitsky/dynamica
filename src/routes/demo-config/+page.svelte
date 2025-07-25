<script lang="ts">
  import { onMount } from "svelte";

  let config = {
    driverPoints: { enabled: true, customData: "", dataLimiter: -1 },
    cryptoPrices: { enabled: true, customData: "", dataLimiter: -1 },
  };
  let currentData: any = null;
  let loading = false;
  let message = "";

  const fetchData = async (url: string, options?: RequestInit) => {
    const response = await fetch(url, options);
    return await response.json();
  };

  const fetchCurrentData = async () => {
    loading = true;
    try {
      currentData = await fetchData("/api/data");
    } catch (error) {
      message = "Error fetching data: " + error;
    } finally {
      loading = false;
    }
  };

  const updateConfig = async () => {
    loading = true;
    try {
      const result = await fetchData("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      message = result.success
        ? "Configuration updated successfully!"
        : "Failed to update configuration";
      if (result.success) await fetchCurrentData();
    } catch (error) {
      message = "Error updating configuration: " + error;
    } finally {
      loading = false;
    }
  };

  const resetConfig = async () => {
    loading = true;
    try {
      const result = await fetchData("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      if (result.success) {
        config = result.config;
        message = "Configuration reset to defaults!";
        await fetchCurrentData();
      } else message = "Failed to reset configuration";
    } catch (error) {
      message = "Error resetting configuration: " + error;
    } finally {
      loading = false;
    }
  };

  const testEndpoint = async (type: string, latest?: boolean) => {
    loading = true;
    try {
      const url = `/api/data?type=${type}${latest ? "&latest=true" : ""}`;
      const data = await fetchData(url);
      currentData =
        type === "drivers" || type === "crypto" ? { [type]: data } : data;
      message = `Fetched ${type} data successfully!`;
    } catch (error) {
      message = `Error testing ${type} endpoint: ${error}`;
    } finally {
      loading = false;
    }
  };

  const simpleTest = () => {
    message = "Simple test executed successfully!";
    console.log("Simple test function called");
  };

  onMount(fetchCurrentData);
</script>

<svelte:head>
  <title>Demo Configuration</title>
</svelte:head>

<div class="container">
  <h1>Demo Configuration Panel</h1>

  {#if message}
    <div class="message {message.includes('Error') ? 'error' : 'success'}">
      {message}
    </div>
  {/if}

  <div class="config-section">
    <h2>Driver Points Configuration</h2>
    <div class="config-item">
      <label>
        <input type="checkbox" bind:checked={config.driverPoints.enabled} />
        Enable Driver Data
      </label>
    </div>
    <div class="config-item">
      <label>
        Data Limiter (-1 for no limit, sets max accessible row):
        <input
          type="number"
          bind:value={config.driverPoints.dataLimiter}
          min="-1"
        />
        <small
          >This controls what's considered the "end" of the data for demo
          purposes</small
        >
      </label>
    </div>
    <div class="config-item">
      <label>
        Custom Data (leave empty for default):
        <textarea
          bind:value={config.driverPoints.customData}
          placeholder="Enter CSV format data..."
          rows="5"
        ></textarea>
      </label>
    </div>
  </div>

  <div class="config-section">
    <h2>Crypto Prices Configuration</h2>
    <div class="config-item">
      <label>
        <input type="checkbox" bind:checked={config.cryptoPrices.enabled} />
        Enable Crypto Data
      </label>
    </div>
    <div class="config-item">
      <label>
        Data Limiter (-1 for no limit, sets max accessible row):
        <input
          type="number"
          bind:value={config.cryptoPrices.dataLimiter}
          min="-1"
        />
        <small
          >This controls what's considered the "end" of the data for demo
          purposes</small
        >
      </label>
    </div>
    <div class="config-item">
      <label>
        Custom Data (leave empty for default):
        <textarea
          bind:value={config.cryptoPrices.customData}
          placeholder="Enter CSV format data..."
          rows="5"
        ></textarea>
      </label>
    </div>
  </div>

  <div class="actions">
    <button on:click={updateConfig} disabled={loading}>
      {loading ? "Updating..." : "Update Configuration"}
    </button>
    <button on:click={resetConfig} disabled={loading}>
      {loading ? "Resetting..." : "Reset to Defaults"}
    </button>
    <button on:click={fetchCurrentData} disabled={loading}>
      {loading ? "Refreshing..." : "Refresh Data"}
    </button>
    <button on:click={simpleTest}>Simple Test</button>
  </div>

  <div class="test-section">
    <h2>Test Endpoints</h2>
    <div class="test-buttons">
      <button on:click={() => testEndpoint("drivers")}
        >Test Drivers (All Accessible)</button
      >
      <button on:click={() => testEndpoint("drivers", true)}
        >Test Drivers (Latest)</button
      >
      <button on:click={() => testEndpoint("crypto")}
        >Test Crypto (All Accessible)</button
      >
      <button on:click={() => testEndpoint("crypto", true)}
        >Test Crypto (Latest)</button
      >
      <button on:click={() => testEndpoint("")}
        >Test Both (All Accessible)</button
      >
      <button on:click={() => testEndpoint("", true)}>Test Both (Latest)</button
      >
    </div>
  </div>

  {#if currentData}
    <div class="data-preview">
      <h2>Current Data Preview</h2>
      <pre>{JSON.stringify(currentData, null, 2)}</pre>
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family:
      -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  h1 {
    color: #333;
    margin-bottom: 30px;
  }

  h2 {
    color: #555;
    margin-bottom: 15px;
  }

  .message {
    padding: 10px 15px;
    border-radius: 5px;
    margin-bottom: 20px;
  }

  .message.success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  .message.error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }

  .config-section {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    border: 1px solid #e9ecef;
  }

  .config-item {
    margin-bottom: 15px;
  }

  .config-item label {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-weight: 500;
  }

  .config-item input[type="checkbox"] {
    margin-right: 10px;
  }

  .config-item input[type="number"] {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    width: 200px;
  }

  .config-item textarea {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: monospace;
    resize: vertical;
  }

  .actions {
    display: flex;
    gap: 10px;
    margin-bottom: 30px;
  }

  .actions button {
    padding: 10px 20px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
  }

  .actions button:hover:not(:disabled) {
    background: #0056b3;
  }

  .actions button:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }

  .test-section {
    background: #e7f3ff;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    border: 1px solid #b3d9ff;
  }

  .test-buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .test-buttons button {
    padding: 8px 16px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .test-buttons button:hover {
    background: #218838;
  }

  .data-preview {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #e9ecef;
  }

  .data-preview pre {
    background: #fff;
    padding: 15px;
    border-radius: 4px;
    border: 1px solid #ddd;
    overflow-x: auto;
    font-size: 12px;
    max-height: 400px;
    overflow-y: auto;
  }
</style>
