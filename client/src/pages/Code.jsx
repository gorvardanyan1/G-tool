import { useState } from 'react';
import { Lock, Unlock, Hash, FileJson, GitBranch, Code as CodeIcon, Eye, EyeOff, Copy, Check } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import api from '../utils/api';

export default function CodeTools() {
  const [activeTab, setActiveTab] = useState('encrypt');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [algorithm, setAlgorithm] = useState('aes');
  const [key, setKey] = useState('');
  const [rounds, setRounds] = useState('10');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleEncrypt = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/code/encrypt', {
        text: input,
        algorithm,
        key: algorithm === 'aes' || algorithm === 'caesar' ? key : undefined
      });
      if (data.success) {
        setOutput(data.data.encrypted);
      }
    } catch (error) {
      console.error('Encryption error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/code/decrypt', {
        text: input,
        algorithm,
        key: algorithm === 'aes' || algorithm === 'caesar' ? key : undefined
      });
      if (data.success) {
        setOutput(data.data.decrypted);
      }
    } catch (error) {
      console.error('Decryption error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHash = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/code/hash', {
        text: input,
        algorithm,
        rounds: algorithm === 'bcrypt' ? rounds : undefined
      });
      if (data.success) {
        setOutput(data.data.hash);
      }
    } catch (error) {
      console.error('Hash error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJWTGenerate = async () => {
    setLoading(true);
    try {
      const payload = JSON.parse(input);
      const { data } = await api.post('/code/jwt/generate', {
        payload,
        secret: key,
        expiresIn: '24h'
      });
      if (data.success) {
        setOutput(data.data.token);
      }
    } catch (error) {
      console.error('JWT generation error:', error);
      setOutput('Invalid JSON payload');
    } finally {
      setLoading(false);
    }
  };

  const handleJWTVerify = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/code/jwt/verify', {
        token: input,
        secret: key
      });
      if (data.success) {
        setOutput(JSON.stringify(data.data, null, 2));
      }
    } catch (error) {
      console.error('JWT verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJsonFormat = async (operation) => {
    setLoading(true);
    try {
      const { data } = await api.post('/code/json/format', {
        json: input,
        operation
      });
      if (data.success) {
        setOutput(data.data.result);
        if (!data.data.isValid) {
          setOutput(`Invalid JSON: ${data.data.error}\n\n${data.data.result}`);
        }
      }
    } catch (error) {
      console.error('JSON format error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSerializeConvert = async (fromFormat, toFormat) => {
    setLoading(true);
    try {
      const { data } = await api.post('/code/serialize/convert', {
        data: input,
        fromFormat,
        toFormat
      });
      if (data.success) {
        setOutput(data.data.result);
      }
    } catch (error) {
      console.error('Serialization error:', error);
      setOutput(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEncode = async (operation) => {
    setLoading(true);
    try {
      const { data } = await api.post('/code/encode', {
        text: input,
        operation
      });
      if (data.success) {
        setOutput(data.data.result);
      }
    } catch (error) {
      console.error('Encoding error:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'encrypt', label: 'Encrypt/Decrypt', icon: Lock },
    { id: 'hash', label: 'Password Hash', icon: Hash },
    { id: 'jwt', label: 'JWT', icon: FileJson },
    { id: 'json', label: 'JSON Tools', icon: FileJson },
    { id: 'serialize', label: 'Serialization', icon: GitBranch },
    { id: 'encode', label: 'Encoding', icon: CodeIcon }
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Code Tools
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Encryption, hashing, JSON tools, serialization, and encoding utilities.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Input
                </label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full h-64 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder={
                    activeTab === 'encrypt' ? 'Enter text to encrypt/decrypt...' :
                    activeTab === 'hash' ? 'Enter text to hash...' :
                    activeTab === 'jwt' ? 'Enter JSON payload or JWT token...' :
                    activeTab === 'json' ? 'Enter JSON...' :
                    activeTab === 'serialize' ? 'Enter data to convert...' :
                    'Enter text to encode/decode...'
                  }
                />
              </div>

              {/* Algorithm/Options Selection */}
              {activeTab === 'encrypt' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Algorithm
                  </label>
                  <select
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="aes">AES</option>
                    <option value="base64">Base64</option>
                    <option value="url">URL Encoding</option>
                    <option value="caesar">Caesar Cipher</option>
                    <option value="reverse">Reverse</option>
                    <option value="rot13">ROT13</option>
                  </select>
                </div>
              )}

              {activeTab === 'hash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hash Algorithm
                  </label>
                  <select
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="bcrypt">bcrypt</option>
                    <option value="php">PHP Password Hash</option>
                    <option value="sha256">SHA-256</option>
                    <option value="sha512">SHA-512</option>
                    <option value="md5">MD5</option>
                  </select>
                  {(algorithm === 'bcrypt' || algorithm === 'php') && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {algorithm === 'php' ? 'Cost (PHP rounds equivalent)' : 'Rounds'}
                      </label>
                      <input
                        type="number"
                        value={rounds}
                        onChange={(e) => setRounds(e.target.value)}
                        min="4"
                        max="15"
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Key Input for AES/JWT */}
              {(activeTab === 'encrypt' && (algorithm === 'aes' || algorithm === 'caesar')) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {algorithm === 'aes' ? 'Secret Key' : 'Shift Amount'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      className="w-full p-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder={algorithm === 'aes' ? 'Enter secret key...' : 'Enter shift number...'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'jwt' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Secret Key (optional)
                  </label>
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Enter secret key or leave empty for default..."
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {activeTab === 'encrypt' && (
                  <>
                    <Button onClick={handleEncrypt} disabled={loading || !input}>
                      <Lock className="w-4 h-4 mr-2" />
                      Encrypt
                    </Button>
                    <Button onClick={handleDecrypt} disabled={loading || !input}>
                      <Unlock className="w-4 h-4 mr-2" />
                      Decrypt
                    </Button>
                  </>
                )}

                {activeTab === 'hash' && (
                  <Button onClick={handleHash} disabled={loading || !input}>
                    <Hash className="w-4 h-4 mr-2" />
                    Generate Hash
                  </Button>
                )}

                {activeTab === 'jwt' && (
                  <>
                    <Button onClick={handleJWTGenerate} disabled={loading || !input}>
                      Generate JWT
                    </Button>
                    <Button onClick={handleJWTVerify} disabled={loading || !input}>
                      Verify JWT
                    </Button>
                  </>
                )}

                {activeTab === 'json' && (
                  <>
                    <Button onClick={() => handleJsonFormat('format')} disabled={loading || !input}>
                      Format
                    </Button>
                    <Button onClick={() => handleJsonFormat('minify')} disabled={loading || !input}>
                      Minify
                    </Button>
                    <Button onClick={() => handleJsonFormat('validate')} disabled={loading || !input}>
                      Validate
                    </Button>
                  </>
                )}

                {activeTab === 'serialize' && (
                  <>
                    <Button onClick={() => handleSerializeConvert('json', 'yaml')} disabled={loading || !input}>
                      JSON → YAML
                    </Button>
                    <Button onClick={() => handleSerializeConvert('yaml', 'json')} disabled={loading || !input}>
                      YAML → JSON
                    </Button>
                    <Button onClick={() => handleSerializeConvert('json', 'xml')} disabled={loading || !input}>
                      JSON → XML
                    </Button>
                    <Button onClick={() => handleSerializeConvert('xml', 'json')} disabled={loading || !input}>
                      XML → JSON
                    </Button>
                  </>
                )}

                {activeTab === 'encode' && (
                  <>
                    <Button onClick={() => handleEncode('url')} disabled={loading || !input}>
                      URL Encode
                    </Button>
                    <Button onClick={() => handleEncode('url-decode')} disabled={loading || !input}>
                      URL Decode
                    </Button>
                    <Button onClick={() => handleEncode('html')} disabled={loading || !input}>
                      HTML Encode
                    </Button>
                    <Button onClick={() => handleEncode('html-decode')} disabled={loading || !input}>
                      HTML Decode
                    </Button>
                    <Button onClick={() => handleEncode('base64')} disabled={loading || !input}>
                      Base64 Encode
                    </Button>
                    <Button onClick={() => handleEncode('base64-decode')} disabled={loading || !input}>
                      Base64 Decode
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Output Section */}
          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Output
                </label>
                {output && (
                  <button
                    onClick={() => copyToClipboard(output)}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>
              <textarea
                value={output}
                readOnly
                className="w-full h-64 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm"
                placeholder="Output will appear here..."
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
