import configs from "./utils/configs";
import ReactDOM from "react-dom";
import React, { Component } from "react";
import { Route } from "react-router-dom";
import PropTypes from "prop-types";
import { serviceNames } from "./utils/ita";
import { connectToReticulum } from "hubs/src/utils/phoenix-utils";
import { Admin, Layout, Resource, ListGuesser } from "react-admin";
//import { EditGuesser, CreateGuesser } from "react-admin";
import { postgrestClient, postgrestAuthenticatior } from "./utils/postgrest-data-provider";
import { AdminMenu } from "./react-components/admin-menu";
import { SceneList, SceneEdit } from "./react-components/scenes";
import { SceneListingList, SceneListingEdit } from "./react-components/scene-listings";
import { AvatarList, AvatarEdit } from "./react-components/avatars";
import { AvatarListingList, AvatarListingEdit } from "./react-components/avatar-listings";
import { FeaturedSceneListingList, FeaturedSceneListingEdit } from "./react-components/featured-scene-listings";
import { PendingSceneList } from "./react-components/pending-scenes";
import { AccountList, AccountEdit } from "./react-components/accounts";
import { ProjectList, ProjectShow } from "./react-components/projects";
import { ServiceEditor } from "./react-components/service-editor";
import { SystemEditor } from "./react-components/system-editor";
import Store from "hubs/src/storage/store";

const store = new Store();

import registerTelemetry from "hubs/src/telemetry";
registerTelemetry("/admin", "Hubs Admin");

const systemRoute = <Route exact path="/system" component={SystemEditor} />;
const serviceRoutes = serviceNames.map(s => {
  return <Route exact key={s} path={`/services/${s}`} render={props => <ServiceEditor {...props} service={s} />} />;
});

const AdminLayout = props => <Layout {...props} menu={props => <AdminMenu {...props} services={serviceNames} />} />;

class AdminUI extends Component {
  static propTypes = {
    dataProvider: PropTypes.func,
    authProvider: PropTypes.func
  };

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Admin
        dashboard={SystemEditor}
        appLayout={AdminLayout}
        customRoutes={[systemRoute].concat(serviceRoutes)}
        dataProvider={this.props.dataProvider}
        authProvider={this.props.authProvider}
        loginPage={false}
        logoutButton={() => <span />}
      >
        <Resource name="pending_scenes" list={PendingSceneList} />
        <Resource
          name="scene_listings"
          list={SceneListingList}
          edit={SceneListingEdit}
          options={{ label: "Approved scenes" }}
        />
        <Resource
          name="featured_scene_listings"
          list={FeaturedSceneListingList}
          edit={FeaturedSceneListingEdit}
          options={{ label: "Featured scenes" }}
        />

        <Resource name="pending_avatars" list={AvatarList} />
        <Resource
          name="avatar_listings"
          list={AvatarListingList}
          edit={AvatarListingEdit}
          options={{ label: "Approved avatars" }}
        />
        <Resource
          name="featured_avatar_listings"
          list={AvatarListingList}
          edit={AvatarListingEdit}
          options={{ label: "Featured avatars" }}
        />

        <Resource name="accounts" list={AccountList} edit={AccountEdit} />
        <Resource name="scenes" list={SceneList} edit={SceneEdit} />
        <Resource name="avatars" list={AvatarList} edit={AvatarEdit} />
        <Resource name="owned_files" />

        <Resource name="projects" list={ProjectList} show={ProjectShow} />

        <Resource name="hubs_metrics" list={ListGuesser} />
      </Admin>
    );
  }
}

import { IntlProvider } from "react-intl";
import { lang, messages } from "./utils/i18n";

const mountUI = async retPhxChannel => {
  let dataProvider;
  let authProvider;

  // If POSTGREST_SERVER is set, we're talking directly to PostgREST over a tunnel, and will be managing the
  // perms token ourselves. If we're not, we talk to reticulum and presume it will handle perms token forwarding.

  if (configs.POSTGREST_SERVER && configs.POSTGREST_SERVER.length > 0) {
    dataProvider = postgrestClient(configs.POSTGREST_SERVER);
    authProvider = postgrestAuthenticatior.createAuthProvider(retPhxChannel);
    await postgrestAuthenticatior.refreshPermsToken();

    // Refresh perms regularly
    setInterval(() => postgrestAuthenticatior.refreshPermsToken(), 60000);
  } else {
    const server = configs.RETICULUM_SERVER || document.location.host;
    dataProvider = postgrestClient("//" + server + "/api/postgrest");
    authProvider = postgrestAuthenticatior.createAuthProvider();
    postgrestAuthenticatior.setAuthToken(store.state.credentials.token);
  }

  ReactDOM.render(
    <IntlProvider locale={lang} messages={messages}>
      <AdminUI dataProvider={dataProvider} authProvider={authProvider} />
    </IntlProvider>,
    document.getElementById("ui-root")
  );
};

document.addEventListener("DOMContentLoaded", async () => {
  const socket = await connectToReticulum();

  // Reticulum global channel
  const retPhxChannel = socket.channel(`ret`, { hub_id: "admin", token: store.state.credentials.token });
  retPhxChannel
    .join()
    .receive("ok", async () => {
      mountUI(retPhxChannel);
    })
    .receive("error", res => {
      document.location = "/?sign_in&sign_in_destination=admin";
      console.error(res);
    });
});
