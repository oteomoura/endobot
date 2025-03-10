import * as dotenv from 'dotenv';
dotenv.config();

import { env } from '@huggingface/transformers';

// Specify a custom location for models (defaults to '/models/').
env.localModelPath = '/path/to/models/';

// Disable the loading of remote models from the Hugging Face Hub:
env.allowRemoteModels = false;

// Set location of .wasm files. Defaults to use a CDN.
env.backends.onnx.wasm.wasmPaths = '/path/to/files/';