![docker-swarm](../images/kubernetes-logo-small.png)

## Kubernetes Example

[manifest.yaml](./manifest.yaml)

Given that there are several alternatives into how to deploy the components, the provided manifest is mainly an example:

- **Important**: No namespace specified so create your own and apply accordingly
- Review and adapt the `ConfigMaps` and `PVCs`
- Review Requests and Limits accordingly
- The example assumes a solution in place to provide ReadWriteMany volumes, such as Longhorn or Rook, adapt accordingly
- Uses a `ReadWriteMany` Volume for a shared **/transcode** location
- Workers are deployed as a StatefulSet and **/codecs** are independent for each worker
- After deployment you must manually configure Plex as well as set the transcode path to: `/transcode`
```
kubectl create namespace plex-system
kubectl apply -f manifest.yaml -n plex-system
```