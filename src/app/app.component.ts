import { Component } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { JwksValidationHandler } from 'angular-oauth2-oidc';
import { Http, Response, Headers, RequestOptions } from '@angular/http';
import { authConfig } from './auth.config';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app';

  constructor(private oauthService: OAuthService, private http: Http) {
    this.configureWithNewConfigApi();
  }

  private configureWithNewConfigApi() {
    this.oauthService.configure(authConfig);
    this.oauthService.tokenValidationHandler = new JwksValidationHandler();
    this.oauthService.loadDiscoveryDocumentAndTryLogin();
  }

  public login() {
    this.oauthService.initImplicitFlow();
  }

  public logoff() {
    this.oauthService.logOut();
  }

  public invoke() {
    console.log('invoke');
    this.apiCall().subscribe(data => {
      console.log('invoke result: %o', data);
    });
  }

  private apiCall() {
    const headers = new Headers({
      'Authorization': 'Bearer ' + this.oauthService.getAccessToken()
    });

    return this.http.get('http://localhost:8081',
      new RequestOptions({headers: headers}))
      .map((res: Response) => res.text());
  }

  public get name() {
    const claims: any = this.oauthService.getIdentityClaims();
    if (!claims) {
      return null;
    }

    return claims.sub;
  }

  public get token() {
    return this.oauthService.getAccessToken();
  }
}
