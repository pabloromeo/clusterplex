# clusterplex

![Version: 1.1.8](https://img.shields.io/badge/Version-1.1.8-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 1.4.13](https://img.shields.io/badge/AppVersion-1.4.13-informational?style=flat-square)

ClusterPlex is basically an extended version of Plex, which supports distributed Workers across a cluster to handle transcoding requests.

<br>

## Source Code

* <https://github.com/pabloromeo/clusterplex>
* <https://github.com/linuxserver/docker-plex>
* <https://plex.tv>

<br>

## Requirements

Kubernetes: `>=1.24.0-0`

| Repository | Name | Version |
|------------|------|---------|
| https://bjw-s.github.io/helm-charts | common | 1.5.1 |

<br>

## Installing the Chart

To install the chart with the release name `clusterplex`:

```console
$ helm repo add clusterplex http://pabloromeo.github.io/clusterplex
$ helm install clusterplex clusterplex/clusterplex
```

<br>

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| global.PGID | int | `1000` | The process group ID that the LinuxServer Plex container will run Plex/Worker as. |
| global.PUID | int | `1000` | The process user ID that the LinuxServer Plex container will run Plex/Worker as. |
| global.clusterplexVersion | string | The appVersion for this chart | The CluterPlex version of docker mod images to pull |
| global.plexImage | object | See below | Configure the plex image that will be used for the PMS and Worker components |
| global.plexImage.imagePullPolicy | string | `"Always"` | Defines when the image should be pulled. Options are Always (default), IfNotPresent, and Never |
| global.plexImage.repository | string | `"linuxserver/plex"` | The image that will be used |
| global.plexImage.tag | string | `"latest"` | The image tag to use |
| global.sharedStorage.additionalMediaVolumes | object | `{}` | Use this section to add additional media mounts if necessary. You can copy the contents of the above media |
| global.sharedStorage.media | object | See below | Configure the media volume that will contain all of your media. If you need more volumes you need to add them under the pms and worker sections manually. Those volumes must already be present in the cluster. |
| global.sharedStorage.media.enabled | bool | `true` | Enables or disables the volume |
| global.sharedStorage.media.existingClaim | string | `nil` | If you want to reuse an existing claim, the name of the existing PVC can be passed here. |
| global.sharedStorage.media.retain | bool | `true` | Set to true to retain the PVC upon `helm uninstall` |
| global.sharedStorage.media.size | string | `"100Gi"` | The amount of storage that is requested for the persistent volume. |
| global.sharedStorage.media.storageClass | string | `nil` | Storage Class for the config volume. If set to `-`, dynamic provisioning is disabled. If set to something else, the given storageClass is used. If undefined (the default) or set to null, no storageClassName spec is set, choosing the default provisioner. NOTE: This class must support ReadWriteMany otherwise you will encounter errors. |
| global.sharedStorage.media.subPath | string | `nil` | Used in conjunction with `existingClaim`. Specifies a sub-path inside the referenced volume instead of its root |
| global.sharedStorage.transcode | object | See below | Configure the volume that will be mounted to the PMS and worker pods for a shared location for transcoding files. |
| global.sharedStorage.transcode.enabled | bool | `true` | Enable or disable the transcode PVC. This should only be disabled if you are not using the workers. |
| global.sharedStorage.transcode.existingClaim | string | `nil` | If you want to reuse an existing claim, the name of the existing PVC can be passed here. |
| global.sharedStorage.transcode.retain | bool | `true` | Set to true to retain the PVC upon `helm uninstall` |
| global.sharedStorage.transcode.size | string | `"10Gi"` | The size of the transcode volume. |
| global.sharedStorage.transcode.storageClass | string | `nil` | Storage class for the transcode volume. If set to `-`, dynamic provisioning is disabled. If set to something else, the given storageClass is used. If undefined (the default) or set to null, no storageClassName spec is set, choosing the default provisioner. NOTE: This class must support ReadWriteMany otherwise you will encounter errors. |
| global.sharedStorage.transcode.subPath | string | `nil` | Used in conjunction with `existingClaim`. Specifies a sub-path inside the referenced volume instead of its root |
| global.timezone | string | `"America/Chicago"` | The timezone configured for each pod |
| orchestrator | object | See below | Configure the orchestrator component |
| orchestrator.config | object | See below | Supply the configuration items used to configure the Orchestrator component |
| orchestrator.config.port | int | `3500` | The port that the Orchestrator will listen on |
| orchestrator.config.workerSelectionStrategy | string | `"LOAD_RANK"` | Configures how the worker is chosen when a transcoding job is initiated. Options are LOAD_CPU, LOAD_TASKS, RR, and LOAD_RANK (default). [[ref]](https://github.com/pabloromeo/clusterplex/tree/master/docs#orchestrator) |
| orchestrator.enableGrafanaDashboard | bool | `false` | Configures if the Grafana dashboard for the orchestrator component is deployed to the cluster or not. If enabled, this creates a ConfigMap containing the dashboard JSON so that your Gradana instance can detect it. This requires your grafana instance to have the grafana.sidecar.dashboards.enabled to be true and the searchNamespace to be set to ALL otherwise this will not be discovered. |
| orchestrator.enabled | bool | `true` | Enable or disable the Orchestrator component |
| orchestrator.env | string | `nil` | Additional environment variables. Template enabled. Syntax options: A) TZ: UTC B) PASSWD: '{{ .Release.Name }}' C) PASSWD:      configMapKeyRef:        name: config-map-name        key: key-name D) PASSWD:      valueFrom:        secretKeyRef:          name: secret-name          key: key-name      ... E) - name: TZ      value: UTC F) - name: TZ      value: '{{ .Release.Name }}' |
| orchestrator.healthProbes | object | See below | Enable or disable the various health check probes for this component |
| orchestrator.healthProbes.liveness | bool | `true` | Enable or disable the liveness probe |
| orchestrator.healthProbes.readiness | bool | `true` | Enable or disable the readiness probe |
| orchestrator.healthProbes.startup | bool | `true` | Enable or disable the startup probe |
| orchestrator.image.pullPolicy | string | `"IfNotPresent"` | image pull policy |
| orchestrator.image.repository | string | `"ghcr.io/pabloromeo/clusterplex_orchestrator"` | image repository |
| orchestrator.prometheusServiceMonitor | object | See below | Configure a ServiceMonitor for use with Prometheus monitoring |
| orchestrator.prometheusServiceMonitor.annotations | object | `{}` | Provide additional additions which may be required. |
| orchestrator.prometheusServiceMonitor.customSelector | object | `{}` | Provide a custom selector if desired. Note that this will take precedent over the default method of using the orchestrators namespace. This usually should not be required. |
| orchestrator.prometheusServiceMonitor.enabled | bool | `false` | Enable the ServiceMonitor creation |
| orchestrator.prometheusServiceMonitor.labels | object | `{}` | Provide additional labels which may be required. |
| orchestrator.prometheusServiceMonitor.scrapeInterval | string | `"30s"` | Configure how often Prometheus should scrape this metrics endpoint in seconds |
| orchestrator.prometheusServiceMonitor.scrapeTimeout | string | `"10s"` | Configure how long Prometheus should wait for the endpoint to reply before considering the request to have timed out. |
| orchestrator.resources | object | See below | Configure the resource requests and limits for the orchestrator component |
| orchestrator.resources.limits.cpu | string | `"500m"` | CPU Limit amount |
| orchestrator.resources.limits.memory | string | `"128Mi"` | Memory Limit amount |
| orchestrator.resources.requests.cpu | string | `"200m"` | CPU Request amount |
| orchestrator.serviceConfig | object | See below | Configure the kubernetes service associated with the the PMS component |
| orchestrator.serviceConfig.annotations | object | `{}` | Provide additional annotations which may be required. |
| orchestrator.serviceConfig.externalTrafficPolicy | string | `nil` | Specify the externalTrafficPolicy for the service. Options: Cluster, Local [[ref](https://kubernetes.io/docs/tutorials/services/source-ip/)] |
| orchestrator.serviceConfig.labels | object | `{}` | Provide additional labels which may be required. |
| orchestrator.serviceConfig.type | string | `"ClusterIP"` | Configure the type of service |
| pms | object | See below | Configure the Plex Media Server component |
| pms.config | object | See below | Supply the configuration items used to configure the PMS component |
| pms.config.localRelayEnabled | bool | `true` | Enable or disable the local relay function. In most cases this should be left to the default (true). If you disable this, you must add the pod IP address of each worker or the pod network CIDR to Plex under the `List of IP addresses and networks that are allowed without auth` option in Plex's network configuration. |
| pms.config.plexClaimToken | string | `nil` | Set the Plex claim token obtained from https://plex.tv/claim |
| pms.config.pmsIP | string | `""` | The IP address that plex is using. This is only utilized if you disable the localRelayEnabled option above. |
| pms.config.port | int | `32400` | The port that Plex will listen on |
| pms.config.relayPort | int | `32499` | The port that the relay service will listen on |
| pms.config.transcodeOperatingMode | string | `"both"` | Set the transcode operating mode. Valid options are local (No workers), remote (only remote workers), both (default, remote first then local if remote fails). If you disable the worker then this will be set to local automatically as that is the only valid option for that confguration. |
| pms.config.transcoderVerbose | int | `1` | Set this to 1 if you want only info logging from the transcoder or 0 if you want debugging logs |
| pms.config.version | string | `"docker"` | Set the version of Plex to use. Valid options are docker, latest, public, or a specific version. [[ref](https://github.com/linuxserver/docker-plex#application-setup)] |
| pms.configVolume | object | See below | Configure the volume that stores all the Plex configuration and metadata |
| pms.configVolume.accessMode | string | `"ReadWriteOnce"` | AccessMode for the persistent volume. Make sure to select an access mode that is supported by your storage provider! [[ref]](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes) |
| pms.configVolume.enabled | bool | `true` | Enables or disables the volume |
| pms.configVolume.existingClaim | string | `nil` | If you want to reuse an existing claim, the name of the existing PVC can be passed here. |
| pms.configVolume.retain | bool | `true` | Set to true to retain the PVC upon `helm uninstall` |
| pms.configVolume.size | string | `"25Gi"` | The amount of storage that is requested for the persistent volume. |
| pms.configVolume.storageClass | string | `nil` | Storage Class for the config volume. If set to `-`, dynamic provisioning is disabled. If set to something else, the given storageClass is used. If undefined (the default) or set to null, no storageClassName spec is set, choosing the default provisioner. |
| pms.configVolume.subPath | string | `nil` | Used in conjunction with `existingClaim`. Specifies a sub-path inside the referenced volume instead of its root |
| pms.enabled | bool | `true` | Enable or disable the Plex Media Server component |
| pms.env | string | `nil` | Additional environment variables. Template enabled. Syntax options: A) TZ: UTC B) PASSWD: '{{ .Release.Name }}' C) PASSWD:      configMapKeyRef:        name: config-map-name        key: key-name D) PASSWD:      valueFrom:        secretKeyRef:          name: secret-name          key: key-name      ... E) - name: TZ      value: UTC F) - name: TZ      value: '{{ .Release.Name }}' |
| pms.healthProbes | object | See below | Enable or disable the various health check probes for this component |
| pms.healthProbes.liveness | bool | `true` | Enable or disable the liveness probe |
| pms.healthProbes.readiness | bool | `true` | Enable or disable the readiness probe |
| pms.healthProbes.startup | bool | `true` | Enable or disable the startup probe |
| pms.ingressConfig | object | See below | Configure the ingress for plex here. |
| pms.ingressConfig.annotations | object | `{}` | Provide additional annotations which may be required. |
| pms.ingressConfig.enabled | bool | `false` | Enables or disables the ingress |
| pms.ingressConfig.hosts[0].host | string | `"chart-example.local"` | Host address. Helm template can be passed. |
| pms.ingressConfig.hosts[0].paths[0].path | string | `"/"` | Path.  Helm template can be passed. |
| pms.ingressConfig.hosts[0].paths[0].service.name | string | `nil` | Overrides the service name reference for this path |
| pms.ingressConfig.hosts[0].paths[0].service.port | string | `nil` | Overrides the service port reference for this path |
| pms.ingressConfig.ingressClassName | string | `nil` | Set the ingressClass that is used for this ingress. |
| pms.ingressConfig.labels | object | `{}` | Provide additional labels which may be required. |
| pms.ingressConfig.tls | list | `[]` | Configure TLS for the ingress. Both secretName and hosts can process a Helm template. |
| pms.resources | object | See below | Configure the resource requests and limits for the PMS component |
| pms.resources.limits.cpu | string | `"4000m"` | CPU Limit amount |
| pms.resources.limits.memory | string | `"4Gi"` | Memory Limit amount |
| pms.resources.requests.cpu | string | `"2000m"` | CPU Request amount |
| pms.serviceConfig | object | See below | Configure the kubernetes service associated with the the PMS component |
| pms.serviceConfig.annotations | object | `{}` | Provide additional annotations which may be required. |
| pms.serviceConfig.externalTrafficPolicy | string | `nil` | Specify the externalTrafficPolicy for the service. Options: Cluster, Local [[ref](https://kubernetes.io/docs/tutorials/services/source-ip/)] |
| pms.serviceConfig.labels | object | `{}` | Provide additional labels which may be required. |
| worker | object | See below | Configure the worker component |
| worker.affinity | object | `{}` | Configure the affinity rules for the worker pods. This helps prevent multiple worker pods from being scheduled on the same node as another worker pod or as the main plex media server. |
| worker.codecVolumes | object | See below | Enable or disable the per-pod volumes that cache the codecs. This saves a great deal of time when starting the workers. |
| worker.codecVolumes.accessMode | string | `"ReadWriteOnce"` | AccessMode for the persistent volume. Make sure to select an access mode that is supported by your storage provider! [[ref]](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes) |
| worker.codecVolumes.annotations | object | `{}` | Add any extra annotations needed |
| worker.codecVolumes.enabled | bool | `true` | Enable or disable the creation of the codec volumes |
| worker.codecVolumes.labels | object | `{}` | Add any extra labels needed |
| worker.codecVolumes.size | string | `"1Gi"` | The size of the volume |
| worker.codecVolumes.storageClass | string | `nil` | Storage Class for the codec volumes If set to `-`, dynamic provisioning is disabled. If set to something else, the given storageClass is used. If undefined (the default) or set to null, no storageClassName spec is set, choosing the default provisioner. |
| worker.config | object | See below | Supply the configuration items used to configure the worker component |
| worker.config.cpuStatInterval | int | `10000` | The frequency at which workers send stats to the orchestrator in ms |
| worker.config.eaeSupport | int | `1` | Controls usage of the EasyAudioDecoder 1 = ON (default) and 0 = OFF |
| worker.config.port | int | `3501` | The port the worker will expose its metrics on for the orchestrator to find |
| worker.config.replicas | int | `2` | The number of instances of the worker to run |
| worker.config.type | string | `"statefulset"` | Determines which controller to use for deploying workers (`statefulset` or `deployment`). Note that `worker.codecVolumes` may require additional configuration when using `deployment`, otherwise codecs will be fetched on every Pod startup. |
| worker.enabled | bool | `true` | Enable or disable the Worker component |
| worker.env | string | `nil` | Additional environment variables. Template enabled. Syntax options: A) TZ: UTC B) PASSWD: '{{ .Release.Name }}' C) PASSWD:      configMapKeyRef:        name: config-map-name        key: key-name D) PASSWD:      valueFrom:        secretKeyRef:          name: secret-name          key: key-name      ... E) - name: TZ      value: UTC F) - name: TZ      value: '{{ .Release.Name }}' |
| worker.healthProbes | object | See below | Enable or disable the various health check probes for this component |
| worker.healthProbes.liveness | bool | `true` | Enable or disable the liveness probe |
| worker.healthProbes.readiness | bool | `true` | Enable or disable the readiness probe |
| worker.healthProbes.startup | bool | `true` | Enable or disable the startup probe |
| worker.resources | object | See below | Configure the resource requests and limits for the worker component |
| worker.resources.limits.cpu | string | `"4000m"` | CPU Limit amount |
| worker.resources.limits.memory | string | `"6Gi"` | Memory Limit amount |
| worker.resources.requests.cpu | string | `"2000m"` | CPU Request amount |
| worker.resources.requests.memory | string | `"3Gi"` | Memory Request Amount |
| worker.serviceConfig | object | See below | Configure the kubernetes service associated with the the PMS component |
| worker.serviceConfig.annotations | object | `{}` | Provide additional annotations which may be required. |
| worker.serviceConfig.externalTrafficPolicy | string | `nil` | Specify the externalTrafficPolicy for the service. Options: Cluster, Local [[ref](https://kubernetes.io/docs/tutorials/services/source-ip/)] |
| worker.serviceConfig.labels | object | `{}` | Provide additional labels which may be required. |

----------------------------------------------
Autogenerated from chart metadata using [helm-docs v1.14.2](https://github.com/norwoodj/helm-docs/releases/v1.14.2)