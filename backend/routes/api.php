<?php

$router->add('GET',  '/ping',                'AuthController', 'ping');
$router->add('POST', '/auth/login',          'AuthController', 'login');
$router->add('POST', '/auth/register',       'AuthController', 'register');
$router->add('GET',  '/auth/me',             'AuthController', 'me');
$router->add('PUT',  '/auth/profile',        'AuthController', 'updateProfile');
$router->add('PUT',  '/auth/password',       'AuthController', 'updatePassword');
$router->add('GET',  '/auth/profile/full',   'AuthController', 'fullProfile');
$router->add('PUT',  '/auth/profile/full',   'AuthController', 'updateFullProfile');
$router->add('POST', '/auth/profile/picture','AuthController', 'uploadProfilePicture');

$router->add('GET',  '/admin/users',         'AuthController', 'listUsers');
$router->add('POST', '/admin/users/approve', 'AuthController', 'approveUser');
$router->add('POST', '/admin/users/reject',  'AuthController', 'rejectUser');
$router->add('POST', '/admin/users/create',  'AuthController', 'adminCreateUser');

$router->add('POST', '/presence/mark',  'PresenceController', 'markToday');
$router->add('GET',  '/presence/me',    'PresenceController', 'myToday');
$router->add('GET',  '/admin/presence', 'PresenceController', 'listToday');

$router->add('GET',  '/desks',        'DeskController', 'list');
$router->add('POST', '/desks/create', 'DeskController', 'create');
$router->add('POST', '/desks/update', 'DeskController', 'update');

$router->add('POST', '/util/hash-code',      'AuthController', 'generateCodeHash');
$router->add("GET", "/admin/debug-users", "AuthController", "debugUsers");

$router->add('POST', '/requests/create', 'RequestController', 'create');
$router->add('GET',  '/requests/mine',   'RequestController', 'mine');
$router->add('GET',  '/requests/all',    'RequestController', 'all');
$router->add('POST', '/requests/reply',  'RequestController', 'reply');

$router->add('GET',  '/qualifications/mine',         'QualificationController', 'mine');
$router->add('POST', '/qualifications/create',       'QualificationController', 'create');
$router->add('POST', '/qualifications/delete',       'QualificationController', 'delete');
$router->add('GET',  '/admin/qualifications',        'QualificationController', 'all');
$router->add('POST', '/admin/qualifications/delete', 'QualificationController', 'adminDelete');
$router->add('POST', '/admin/qualifications/approve','QualificationController', 'approve');

$router->add('GET',  '/documents/mine',   'DocumentController', 'mine');
$router->add('POST', '/documents/upload', 'DocumentController', 'upload');
$router->add('POST', '/documents/delete', 'DocumentController', 'delete');

$router->add('GET',  '/opportunities',        'OpportunityController', 'list');
$router->add('POST', '/opportunities/create', 'OpportunityController', 'create');
$router->add('POST', '/opportunities/delete', 'OpportunityController', 'delete');

$router->add('POST', '/sla/import-targets',   'SlaController', 'importTargets');
$router->add('POST', '/sla/import-data',      'SlaController', 'importData');
$router->add('GET',  '/sla/companies',        'SlaController', 'companies');
$router->add('GET',  '/sla/targets',          'SlaController', 'targets');
$router->add('POST', '/sla/targets',          'SlaController', 'saveTarget');
$router->add('POST', '/sla/targets/delete',   'SlaController', 'deleteTarget');
$router->add('POST', '/sla/link-desk-company','SlaController', 'linkDeskCompany');
$router->add('GET',  '/sla/dashboard',        'SlaController', 'adminDashboard');
$router->add('GET',  '/sla/dashboard/mine',   'SlaController', 'supervisorDashboard');
$router->add('GET',  '/sla/stream',           'SlaController', 'stream');

$router->add('GET',  '/case-audits/lookup-agent', 'CaseAuditController', 'lookupAgent');
$router->add('GET',  '/case-audits/mine',        'CaseAuditController', 'mine');
$router->add('POST', '/case-audits',        'CaseAuditController', 'create');
$router->add('GET',  '/case-audits',        'CaseAuditController', 'forAgent');
$router->add('GET',  '/case-audits/export', 'CaseAuditController', 'exportForAgent');

$router->add('GET',  '/transport/agents',          'TransportController', 'agents');
$router->add('POST', '/transport/drafts/create',   'TransportController', 'createDraft');
$router->add('GET',  '/transport/drafts/mine',     'TransportController', 'myDrafts');
$router->add('GET',  '/transport/requests/mine',   'TransportController', 'myHistory');
$router->add('GET',  '/transport/requests/detail', 'TransportController', 'detail');
$router->add('POST', '/transport/items/add',       'TransportController', 'addItems');
$router->add('POST', '/transport/items/update',    'TransportController', 'updateItem');
$router->add('POST', '/transport/items/delete',    'TransportController', 'deleteItem');
$router->add('POST', '/transport/items/apply-all', 'TransportController', 'applyAll');
$router->add('POST', '/transport/requests/send',   'TransportController', 'send');
$router->add('GET',  '/admin/transport/pending',   'TransportController', 'pendingForAdmin');
$router->add('GET',  '/admin/transport/all',       'TransportController', 'allForAdmin');
$router->add('POST', '/admin/transport/decide',    'TransportController', 'decide');
$router->add('GET',  '/admin/transport/export',    'TransportController', 'exportCsv');

$router->add('POST', '/insurance/create', 'InsuranceController', 'create');
$router->add('GET',  '/insurance/mine',   'InsuranceController', 'mine');
$router->add('GET',  '/insurance/all',    'InsuranceController', 'all');
$router->add('POST', '/insurance/status', 'InsuranceController', 'updateStatus');
