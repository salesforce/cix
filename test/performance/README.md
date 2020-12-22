d### Performance tests
Below are some notes on how to performance test CIX.

## Logging

# Confirming pipeline streams are getting destroyed.
We create a log stream for each pipeline. This log stream can buffer up to 18MB and should be destroyed at the end of an pipeline execution. To test this we can output a large amount of logs repeatedly with no remote client draining the stream.

1. Run CIX repeatedly ``./cix.mjs exec -y performance/heavy_logging.yaml -y performance/heavy_logging.yaml -y performance/heavy_logging.yaml -y performance/heavy_logging.yaml -y performance/heavy_logging.yaml -y performance/heavy_logging.yaml -y performance/heavy_logging.yaml -y performance/heavy_logging.yaml -y performance/heavy_logging.yaml -y performance/heavy_logging.yaml > perf.log``
2. Watch memory usage for continual growth (Activity Monitor on MacOS does the trick)

# Testing high throughput
1. Start a server, point console logs at a file: ``./cix.mjs server -l console > server.log``
2. Load the heavy logging yaml: ``./cix.mjs load -y performance/heavy_logging.yaml``
3. Start a client, point console logs at a file: ``./cix.mjs resume > client.log``
4. Diff the files, there should only be some expected application log differences: ``diff client.log server.log``


# Testing back pressure
If logs are getting generated faster than the client can read them, shed some of the logs without impacting the pipeline execution.

1. Start a CIX Server ``./cix.mjs server -l console``
2. Run a pipeline at 64kbps throughput (about 2min to download, pipeline generates 100MB in 30sec) ``./cix.mjs load -y performance/heavy_logging.yaml && curl -s --limit-rate 64k -X GET "http://localhost:10030/api/pipeline/undefined/start" -H  "accept: application/json" > client.log``
3. You should see the  echo "complete" at the end of the server log. This means the back pressure didn't effect the execution.
4. You should see the size of the client log is quite a bit smaller, that's because it didn't stream all the logs.
